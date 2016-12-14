$('#configuration').submit(function (event) {
  event.preventDefault();

  var data = {
    gcmSenderId: $('[name="gcmSenderId"]').val(),
    gcmServerKey: $('[name="gcmServerKey"]').val(),
    gcmPackageName: $('[name="gcmPackageName"]').val(),
    apnAuthKey: $('[name="apnAuthKey"]').val(),
    apnKeyId: $('[name="apnKeyId"]').val(),
    apnTeamId: $('[name="apnTeamId"]').val(),
    apnTopic: $('[name="apnTopic"]').val(),
    wnsClientId: $('[name="wnsClientId"]').val(),
    wnsClientSecret: $('[name="wnsClientSecret"]').val(),
    showAutomatically: $('[name="showAutomatically"]').is(':checked')
  };

  data.gcm = !!(data.gcmSenderId && data.gcmServerKey && data.gcmPackageName);
  data.apn = !!(data.apnAuthKey && data.apnKeyId && data.apnTeamId && data.apnTopic);
  data.wns = !!(data.wnsClientId && data.wnsClientSecret);

  data.configured = !! (data.gcm || data.apn || data.wns);

  Fliplet.Widget.save(data).then(function () {
    Fliplet.Widget.complete();
  });
});

Fliplet.Navigator.onReady().then(function () {
  Fliplet.Widget.autosize();
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});