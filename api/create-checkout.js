const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  const { price, uid, email } = req.query;
  if (!price || !uid) return res.status(400).json({ error: 'Missing params' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://mio-cane-enci.vercel.app/?payment=success',
      cancel_url: 'https://mio-cane-enci.vercel.app/?payment=cancel',
      customer_email: email,
      metadata: { uid },
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: null }
    });
    res.redirect(303, session.url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
