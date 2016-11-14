$('#configuration').submit(function (event) {
  event.preventDefault();

  var data = {
    gcmSenderId: $('[name="gcmSenderId"]').val(),
    gcmServerKey: $('[name="gcmServerKey"]').val(),
    gcmPackageName: $('[name="gcmPackageName"]').val()
  }

  data.gcm = !!(data.gcmSenderId && data.gcmServerKey && data.gcmPackageName);
  data.configured = !!data.gcm;

  console.log(data)

  Fliplet.Widget.save(data).then(function () {
    Fliplet.Widget.complete();
  });
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});