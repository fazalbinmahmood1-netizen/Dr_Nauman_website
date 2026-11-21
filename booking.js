const booking = document.getElementById('appointment-request');
const statusLine = document.getElementById('booking-status');
const submit = booking.querySelector('button[type="submit"]');
let pending = false;

booking.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  const payload = new FormData(booking);
  // An optional blank reply address should not be passed as an email header.
  if (!payload.get('email')) payload.delete('email');
  payload.set('_subject', 'Consultation request — ' + payload.get('clinic'));
  payload.set('_template', 'table');
  pending = true;
  submit.disabled = true;
  statusLine.textContent = 'Sending your request…';
  try {
    const endpoint = new URL(booking.action);
    endpoint.pathname = '/ajax' + endpoint.pathname;
    const response = await fetch(endpoint, {
      method: 'POST',
      referrerPolicy: 'origin',
      headers: { Accept: 'application/json' },
      body: payload,
      signal: AbortSignal.timeout(25000)
    });
    const result = await response.json();
    if (!response.ok || String(result.success) !== 'true' || /activat|verify|confirm your email/i.test(result.message || '')) {
      throw new Error('Delivery not confirmed');
    }
    booking.reset();
    booking.querySelector('fieldset').hidden = true;
    statusLine.textContent = 'Thank you! Your consultation request has been submitted. We’ll get back to you within one day to confirm your appointment.';
  } catch {
    statusLine.replaceChildren('We couldn’t confirm delivery. Your details are still here. Please try again or ');
    const contact = document.createElement('a');
    contact.href = '#hospital';
    contact.textContent = 'call your preferred clinic';
    statusLine.append(contact, '.');
  } finally {
    pending = false;
    submit.disabled = false;
  }
});
