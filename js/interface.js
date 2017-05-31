var $tbody = $('#jobs-entries');
var source = $('#template-table-entries').html();
var jobEntriesTemplate = Handlebars.compile(source);

function refreshReports() {
  $('#report .spinner-holder').addClass('animated');
  $('.table-holder').addClass('hidden');
  $('.no-data').removeClass('show');
  $tbody.html('');
  Fliplet.Widget.autosize();

  var reportData = {
    jobs: []
  };

  Fliplet.App.Logs.get({
    where: {
      type: 'job'
    }
  }).then(function(jobs) {
    jobs.forEach(function(job) {
      var customJob = {
        createdAt: '',
        title: '',
        message: '',
        totalDeliveries: '',
        totalSuccess: '',
        sentGoogle: '',
        sentApple: '',
        sentWindows: ''
      }

      var apnSuccess = 0;
      var gcmSuccess = 0;
      var wnsSuccess = 0;
      var apn = 0;
      var gcm = 0;
      var wns = 0;

      customJob.createdAt = moment(job.createdAt).format('MMM Do YYYY - HH:mm:ss');
      customJob.title = job.data.job.data.payload.title;
      customJob.message = job.data.job.data.payload.body;

      job.data.result.forEach(function(result) {
        if (result.method === 'apn') {
          apnSuccess = result.success + apnSuccess;
          apn = result.success + result.failure + apn;
        }
        if (result.method === 'gcm') {
          gcmSuccess = result.success + gcmSuccess;
          gcm = result.success + result.failure + gcm;
        }
        if (result.method === 'wns') {
          wnsSuccess = result.success + wnsSuccess;
          wns = result.success + result.failure + wns;
        }
      })

      customJob.totalDeliveries = job.data.job.data.tokens.length;
      customJob.totalSuccess = apnSuccess + gcmSuccess + wnsSuccess;
      customJob.deliveryPerct = Math.round(((customJob.totalSuccess / customJob.totalDeliveries) * 100) * 10) / 10;
      customJob.sentGoogle = gcm;
      customJob.sentApple = apn;
      customJob.sentWindows = wns;

      reportData.jobs.push(customJob);
    });
    var compiledEntries;

    if (reportData.jobs.length) {
      compiledEntries = jobEntriesTemplate(reportData);
      $tbody.html(compiledEntries);
      $('#report .spinner-holder').removeClass('animated');
      $('.table-holder').removeClass('hidden');
    } else {
      $('#report .spinner-holder').removeClass('animated');
      $('.no-data').addClass('show');
    }

    Fliplet.Widget.autosize();
  });
}

$('.app-name').html(Fliplet.Env.get('appName'));
new UINotification();
Fliplet.Widget.autosize();
Fliplet.Studio.emit('widget-save-label-update', {text: ''});

$(window).on('resize', Fliplet.Widget.autosize);

$('.nav-tabs').on('click', 'a[data-toggle="tab"]', function(event) {
  event.preventDefault();
  var href = $(this).attr('href');
  var saveButtonLabel = 'Save';
  $('#configuration').attr('disabled', (href === '#notification-send-tab'));
  $(this).tab('show');
  Fliplet.Widget.autosize();
  if (href === '#notification-send-tab' || href === '#report') {
    saveButtonLabel = '';
  }
  Fliplet.Studio.emit('widget-save-label-update', {text: saveButtonLabel});
});

$('a#note-reports').on('shown.bs.tab', function(event) {
  event.preventDefault();
  refreshReports();
});

$('.tab-pane#report .refresh').on('click', function(event) {
  event.preventDefault();
  refreshReports();
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function() {
  $('form').submit();
});

$('#configuration').on('submit', function(event) {
  event.preventDefault();
  if ($(this).attr('disabled')) {
    return;
  }

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
    showAutomatically: $('[name="showAutomatically"]').is(':checked'),
    showOnceOnPortal: $('[name="showOnceOnPortal"]').is(':checked'),
    popupTitle: $('[name="popup_title"]').val(),
    popupMessage: $('[name="popup_message"]').val()
  };

  data.gcm = !!(data.gcmSenderId && data.gcmServerKey && data.gcmPackageName);
  data.apn = !!(data.apnAuthKey && data.apnKeyId && data.apnTeamId && data.apnTopic);
  data.wns = !!(data.wnsClientId && data.wnsClientSecret);

  data.configured = !!(data.gcm || data.apn || data.wns);

  Fliplet.Widget.save(data).then(function() {
    Fliplet.Widget.complete();
  });
});
