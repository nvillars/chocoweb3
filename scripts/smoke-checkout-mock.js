const mock = require('../src/lib/mock-db');

console.log('Initial products', mock.dumpState().products.length);
const items = [{ productId: 'p1', qty: 2 }, { productId: 'p2', qty: 1 }];
const created = mock.createOrderPending({ items, shipping: { method: 'envio', price: 10 }, address: { name: 'Test', email: 't@test' }, paymentMethod: 'wallet', idempotencyKey: 'k1' });
console.log('Created', created.order.id, created.order.amounts.total);
const token = created.orderToken && created.orderToken.token;
console.log('OrderToken', token);
const confirm = mock.confirmPayment({ orderToken: token });
console.log('Confirm result', confirm.ok, confirm.order.status);
console.log('Dump', mock.dumpState());
