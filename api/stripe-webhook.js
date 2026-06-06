const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const tierMap = {};
tierMap[process.env.STRIPE_PRICE_PRO] = 'pro';
tierMap[process.env.STRIPE_PRICE_BREEDER] = 'breeder_pro';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const uid = session.metadata.uid;
      const subId = session.subscription;
      const sub = await stripe.subscriptions.retrieve(subId);
      const priceId = sub.items.data[0].price.id;
      const tier = tierMap[priceId] || 'pro';
      await supabase.from('profili').update({
        tier,
        stripe_customer_id: session.customer,
        stripe_subscription_id: subId,
        trial_end: null
      }).eq('id', uid);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.from('profili').update({
        tier: 'free',
        stripe_subscription_id: null
      }).eq('stripe_customer_id', sub.customer);
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const priceId = sub.items.data[0].price.id;
      const tier = tierMap[priceId] || 'pro';
      const active = sub.status === 'active' || sub.status === 'trialing';
      await supabase.from('profili').update({
        tier: active ? tier : 'free'
      }).eq('stripe_customer_id', sub.customer);
      break;
    }
  }

  res.json({ received: true });
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
