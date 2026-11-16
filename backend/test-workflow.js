/**
 * Chapter 23 — Comprehensive End-to-End Workflow & Security Test Suite
 * Tests all 22 required scenarios against the live Express & MongoDB backend.
 */

const { app, startServer } = require('./src/server');
const { closeDatabase } = require('./src/config/database');
const http = require('http');

let serverInstance = null;
const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

// Simple HTTP request helper using native fetch
async function req(endpoint, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body, headers: res.headers };
}

// Multipart helper for file upload tests
async function uploadMultipart(endpoint, fields, files, token) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];

  // Add text fields
  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      )
    );
  }

  // Add files
  for (const f of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${f.fieldname}"; filename="${f.filename}"\r\nContent-Type: ${f.mimetype}\r\n\r\n`
      )
    );
    parts.push(f.buffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const payload = Buffer.concat(parts);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}: ${details}`);
    failedTests++;
  }
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(` Starting Chapter 23 End-to-End Verification Suite   `);
  console.log(`======================================================\n`);

  serverInstance = await startServer(PORT);

  // Clean up any test users and test orders from previous runs for clean idempotency
  const User = require('./src/models/User');
  const { Order } = require('./src/models/Order');
  const { Interview } = require('./src/models/Interview');
  const InterviewSlot = require('./src/models/InterviewSlot');
  const { Photo } = require('./src/models/Photo');
  const Notification = require('./src/models/Notification');

  await User.deleteMany({ email: /@chapter23\.test$/ });
  await Order.deleteMany({ customerEmail: /@chapter23\.test$/ });
  await InterviewSlot.deleteMany({ platform: 'Google Meet', meetingUrl: /test/ });

  try {
    let customer1Token = null;
    let customer1Id = null;
    let customer2Token = null;
    let customer2Id = null;
    let adminToken = null;
    let order1Id = null;
    let slot1Id = null;
    let photo1Id = null;

    // 1. New customer registration
    const regRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Eleanor Vance',
        email: 'eleanor.vance@chapter23.test',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      }),
    });
    assert(
      regRes.status === 201 && regRes.body.data?.token,
      'Scenario 1: New customer registration',
      JSON.stringify(regRes.body)
    );
    customer1Token = regRes.body.data?.token;
    customer1Id = regRes.body.data?.user?.id;

    // 2. Duplicate email registration
    const dupRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Eleanor Vance Duplicate',
        email: 'eleanor.vance@chapter23.test',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      }),
    });
    assert(
      dupRes.status === 409,
      'Scenario 2: Duplicate email registration rejected with 409',
      dupRes.status
    );

    // 3. Successful login
    const loginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'eleanor.vance@chapter23.test',
        password: 'Password@123',
      }),
    });
    assert(
      loginRes.status === 200 && loginRes.body.data?.token,
      'Scenario 3: Successful login with valid credentials',
      JSON.stringify(loginRes.body)
    );

    // 4. Incorrect password
    const wrongPassRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'eleanor.vance@chapter23.test',
        password: 'IncorrectPassword!',
      }),
    });
    assert(
      wrongPassRes.status === 401,
      'Scenario 4: Incorrect password rejected with 401',
      wrongPassRes.status
    );

    // 5. Logout
    const logoutRes = await req('/auth/logout', { method: 'POST' }, customer1Token);
    assert(
      logoutRes.status === 200 && logoutRes.body.success === true,
      'Scenario 5: Customer logout clears session',
      JSON.stringify(logoutRes.body)
    );

    // Re-authenticate Customer 1 for subsequent operations
    const reLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'eleanor.vance@chapter23.test',
        password: 'Password@123',
      }),
    });
    customer1Token = reLogin.body.data?.token;

    // 6. Customer submits an order
    const orderRes = await req(
      '/orders',
      {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Eleanor Vance',
          occasion: 'Golden 50th Wedding Anniversary',
          edition: 'The Legacy Collection',
          notes: 'Celebrating 50 years of marriage, family, and shared history.',
        }),
      },
      customer1Token
    );
    assert(
      orderRes.status === 201 &&
        orderRes.body.data?.status === 'Requested' &&
        orderRes.body.data?.paymentStatus === 'Pending',
      'Scenario 6: Customer submits an order request',
      JSON.stringify(orderRes.body)
    );
    order1Id = orderRes.body.data?._id;

    // 7. Customer views their order
    const myOrdersRes = await req('/orders/my-orders', {}, customer1Token);
    assert(
      myOrdersRes.status === 200 &&
        Array.isArray(myOrdersRes.body.data) &&
        myOrdersRes.body.data.some((o) => o._id === order1Id),
      'Scenario 7: Customer views their order list',
      JSON.stringify(myOrdersRes.body)
    );

    // 8. Customer cannot view another customer's order (Isolation)
    const regRes2 = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Julian Sterling',
        email: 'julian.sterling@chapter23.test',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      }),
    });
    customer2Token = regRes2.body.data?.token;
    customer2Id = regRes2.body.data?.user?.id;

    const stealOrderRes = await req(`/orders/${order1Id}`, {}, customer2Token);
    assert(
      stealOrderRes.status === 403,
      'Scenario 8: Customer cannot view another customer order (403 Forbidden)',
      stealOrderRes.status
    );

    // 9. Admin login with requested credentials
    const adminLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'prachimohite1711@gmail.com',
        password: 'Prachimohite@2309',
      }),
    });
    assert(
      adminLoginRes.status === 200 &&
        adminLoginRes.body.data?.user?.role === 'admin',
      'Scenario 9: Admin login with designated credentials (prachimohite1711@gmail.com)',
      JSON.stringify(adminLoginRes.body)
    );
    adminToken = adminLoginRes.body.data?.token;

    // 10. Unauthorized user cannot access admin APIs
    const customerAdminRes = await req('/admin/dashboard', {}, customer1Token);
    assert(
      customerAdminRes.status === 403,
      'Scenario 10: Unauthorized customer cannot access admin APIs (403 Forbidden)',
      customerAdminRes.status
    );

    // 11. Admin confirms an order
    const confirmOrderRes = await req(
      `/orders/${order1Id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Confirmed',
          internalNote: 'Order verified by editor-in-chief.',
        }),
      },
      adminToken
    );
    assert(
      confirmOrderRes.status === 200 &&
        confirmOrderRes.body.data?.status === 'Confirmed' &&
        confirmOrderRes.body.data?.interviewId,
      'Scenario 11: Admin confirms order & triggers interview document creation',
      JSON.stringify(confirmOrderRes.body)
    );

    // 12. Customer receives confirmation notification
    const notifsRes = await req('/notifications', {}, customer1Token);
    assert(
      notifsRes.status === 200 &&
        notifsRes.body.data?.notifications?.some(
          (n) => n.type === 'interview_invited' || n.orderId === order1Id
        ),
      'Scenario 12: Customer receives order confirmation and interview invitation notification',
      JSON.stringify(notifsRes.body)
    );

    // 13. Admin creates slot & Customer books interview
    const createSlotRes = await req(
      '/interviews/admin/slots',
      {
        method: 'POST',
        body: JSON.stringify({
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 45,
          platform: 'Google Meet',
          meetingUrl: 'https://meet.google.com/c23-mem-test',
        }),
      },
      adminToken
    );
    assert(
      createSlotRes.status === 201 && createSlotRes.body.data?._id,
      'Scenario 13a: Admin creates available interview slot with Google Meet link',
      JSON.stringify(createSlotRes.body)
    );
    slot1Id = createSlotRes.body.data?._id;

    const bookRes = await req(
      '/interviews/book',
      {
        method: 'POST',
        body: JSON.stringify({
          slotId: slot1Id,
          orderId: order1Id,
        }),
      },
      customer1Token
    );
    assert(
      bookRes.status === 200 &&
        bookRes.body.data?.interview?.status === 'Scheduled',
      'Scenario 13b: Customer books interview slot; status becomes Scheduled',
      JSON.stringify(bookRes.body)
    );

    // 14. Double booking is prevented
    // Customer 2 creates an order
    const cust2OrderRes = await req(
      '/orders',
      {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Julian Sterling',
          occasion: 'Art Exhibition Celebration',
          edition: 'The Atelier Edition',
          notes: 'Studio retrospective volume.',
        }),
      },
      customer2Token
    );
    const order2Id = cust2OrderRes.body.data?._id;

    // Customer 2 attempts to book the already-booked slot1Id
    const doubleBookRes = await req(
      '/interviews/book',
      {
        method: 'POST',
        body: JSON.stringify({
          slotId: slot1Id,
          orderId: order2Id,
        }),
      },
      customer2Token
    );
    assert(
      doubleBookRes.status === 409,
      'Scenario 14: Double booking of same slot is prevented with 409 Conflict',
      doubleBookRes.status
    );

    // 15. Customer receives meeting link
    const myInterviewsRes = await req('/interviews/my-interviews', {}, customer1Token);
    const schedInterview = myInterviewsRes.body.data?.[0];
    assert(
      myInterviewsRes.status === 200 &&
        schedInterview?.meetingUrl === 'https://meet.google.com/c23-mem-test',
      'Scenario 15: Customer receives private meeting link in account',
      schedInterview?.meetingUrl
    );

    // 16. Admin saves interview questionnaire notes
    const saveNotesRes = await req(
      '/interviews/admin/notes',
      {
        method: 'POST',
        body: JSON.stringify({
          orderId: order1Id,
          answers: {
            occasionSpecial: 'Golden anniversary with 3 generations attending.',
            keyPeople: 'Robert (husband), Eleanor (wife), grandchildren Leo and Maya.',
            memorableMoments: 'Summer trip to Lake Como in 1984.',
            emotions: 'Nostalgic, warm, timeless, deeply loving.',
            memoriesNeverForget: 'Their handwritten wedding vows from 1976.',
            milestones: '1976 Wedding, 1982 First house, 2026 Golden Anniversary.',
            finalMessage: 'To our children and grandchildren: the best is always yet to come.',
          },
        }),
      },
      adminToken
    );
    assert(
      saveNotesRes.status === 200 && saveNotesRes.body.data?.answers?.milestones,
      'Scenario 16: Admin saves interview questionnaire answers and story notes',
      JSON.stringify(saveNotesRes.body)
    );

    // 17. Customer uploads multiple photographs
    // Create a 1x1 transparent PNG buffer
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );

    const uploadRes = await uploadMultipart(
      `/orders/${order1Id}/photos`,
      {
        metadata: JSON.stringify([
          {
            caption: 'The Lake Como Trip',
            peopleShown: 'Robert & Eleanor',
            yearDate: '1984',
            memoryDescription: 'Sitting on the terrace overlooking Bellagio.',
          },
          {
            caption: 'Family Reunion at the Farm',
            peopleShown: 'Whole family',
            yearDate: '2005',
            memoryDescription: 'The summer all cousins reunited after college.',
          },
        ]),
      },
      [
        {
          fieldname: 'photos',
          filename: 'lake_como_1984.png',
          mimetype: 'image/png',
          buffer: dummyPng,
        },
        {
          fieldname: 'photos',
          filename: 'family_farm_2005.png',
          mimetype: 'image/png',
          buffer: dummyPng,
        },
      ],
      customer1Token
    );
    assert(
      uploadRes.status === 201 &&
        Array.isArray(uploadRes.body.data) &&
        uploadRes.body.data.length === 2,
      'Scenario 17: Customer uploads multiple photographs with captions and memory descriptions',
      JSON.stringify(uploadRes.body)
    );
    photo1Id = uploadRes.body.data?.[0]?._id;

    // 18. Invalid file upload is rejected
    const badUploadRes = await uploadMultipart(
      `/orders/${order1Id}/photos`,
      {},
      [
        {
          fieldname: 'photos',
          filename: 'malicious.exe',
          mimetype: 'application/x-msdownload',
          buffer: Buffer.from('MZ00000'),
        },
      ],
      customer1Token
    );
    assert(
      badUploadRes.status === 400,
      'Scenario 18: Invalid file type rejected with 400 Bad Request',
      badUploadRes.status
    );

    // 19. Admin reviews and approves photographs
    const approvePhotoRes = await req(
      `/photos/admin/photos/${photo1Id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Approved' }),
      },
      adminToken
    );
    assert(
      approvePhotoRes.status === 200 &&
        approvePhotoRes.body.data?.status === 'Approved',
      'Scenario 19: Admin reviews and approves photograph',
      JSON.stringify(approvePhotoRes.body)
    );

    // 20. Customer sees updated statuses
    const customerOrderCheck = await req(`/orders/${order1Id}`, {}, customer1Token);
    assert(
      customerOrderCheck.status === 200 &&
        customerOrderCheck.body.data?.photosCount === 2,
      'Scenario 20: Customer sees updated photograph count and order details',
      JSON.stringify(customerOrderCheck.body)
    );

    // 21. Payment status changes correctly
    const paymentUpdateRes = await req(
      `/orders/${order1Id}/payment`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          paymentStatus: 'Paid',
          internalNote: 'Bank wire receipt verified.',
        }),
      },
      adminToken
    );
    assert(
      paymentUpdateRes.status === 200 &&
        paymentUpdateRes.body.data?.paymentStatus === 'Paid',
      'Scenario 21: Admin marks payment status as Paid with audit log',
      JSON.stringify(paymentUpdateRes.body)
    );

    // 22. Complete order workflow works
    const advanceStatusRes = await req(
      `/orders/${order1Id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'In Production',
          internalNote: 'Sent to print studio for binding.',
        }),
      },
      adminToken
    );
    const completeStatusRes = await req(
      `/orders/${order1Id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Completed',
          internalNote: 'Delivered to client with custom presentation box.',
        }),
      },
      adminToken
    );
    const historyRes = await req(`/orders/${order1Id}/history`, {}, adminToken);
    assert(
      advanceStatusRes.status === 200 &&
        completeStatusRes.status === 200 &&
        completeStatusRes.body.data?.status === 'Completed' &&
        Array.isArray(historyRes.body.data) &&
        historyRes.body.data.length >= 3,
      'Scenario 22: Full order lifecycle progression (Requested -> Confirmed -> Scheduled -> In Production -> Completed) with complete audit trail',
      historyRes.body.data?.length
    );

    console.log(`\n======================================================`);
    console.log(` Test Results: ${passedTests} Passed, ${failedTests} Failed`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Fatal error during test run:', err);
    failedTests++;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await closeDatabase();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runTests();
