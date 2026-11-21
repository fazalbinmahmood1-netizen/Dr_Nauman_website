const booking = document.getElementById('appointment-request');
const bookingStatus = document.getElementById('booking-status');
const recipient = 'mnbashir360@gmail.com';
booking.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(booking);
  const labels = {
    patient: 'Patient name', phone: 'Phone number', email: 'Reply email',
    clinic: 'Preferred clinic', date: 'Preferred date', time: 'Preferred time',
    notes: 'Scheduling preferences'
  };
  const details = Object.entries(labels)
    .filter(([key]) => fields.get(key)?.trim())
    .map(([key, label]) => label + ': ' + fields.get(key).trim());
  const message = ['Hello Dr. Nauman,', '', 'I would like to request a consultation.', '', ...details].join('\r\n');
  const subject = 'Consultation request — ' + fields.get('clinic');
  const url = 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message);
  const retry = document.createElement('a');
  retry.href = url;
  retry.textContent = 'Open email draft again';
  bookingStatus.replaceChildren('Press Send in your email app to submit your request. ', retry);
  window.location.href = url;
});
