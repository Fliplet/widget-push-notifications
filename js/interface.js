var $tbody = $('#jobs-entries');
var source = $('#template-table-entries').html();
var jobEntriesTemplate = Handlebars.compile(source);
var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData(widgetId) || {};

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
    },
    order: [
      ['createdAt', 'DESC']
    ]
  }).then(function(logs) {
    logs.forEach(function(log) {
      var logData = {
        createdAt: '',
        title: '',
        message: '',
        recipientsCount: 0,
        deliveredCount: 0,
        sentGoogle: 0,
        sentApple: 0,
        sentWindows: 0,
        batchesCount: log.data.jobs && log.data.jobs.length,
        batchesSent: log.data.jobs && log.data.jobs.length // this get updated further down
      }

      var apnSuccess = 0;
      var gcmSuccess = 0;
      var wnsSuccess = 0;

      logData.createdAt = moment(log.createdAt).format('MMM Do YYYY - HH:mm:ss');
      logData.title = log.data.payload && log.data.payload.title;
      logData.message = log.data.payload && log.data.payload.body;

      function processJobResult(result) {
        switch (result.method) {
          case 'apn':
            apnSuccess += result.success;
            logData.sentApple += result.success + result.failure;
            break;
          case 'gcm':
            gcmSuccess += result.success;
            logData.sentGoogle += result.success + result.failure;
            break;
          case 'wns':
            wnsSuccess += result.success;
            logData.sentWindows += result.success + result.failure;
            break;
        }
      }

      if (Array.isArray(log.data.result)) {
        logData.batchesSent = log.data.result.length;

        log.data.result.forEach(function(job) {
          if (Array.isArray(job.result)) {
            job.result.forEach(processJobResult);
          }
        });
      }

      logData.recipientsCount = log.data.subscriptionsCount;
      logData.deliveredCount = apnSuccess + gcmSuccess + wnsSuccess;
      logData.deliveryPerct = (Math.round(((logData.deliveredCount / logData.recipientsCount) * 100) * 10) / 10) || 0;

      reportData.jobs.push(logData);
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

$('.nav-tabs').on('click', 'a[data-toggle="tab"]', function (event) {
  event.preventDefault();
  var href = $(this).attr('href');
  var saveButtonLabel = 'Save';
  $('#configuration').attr('disabled', (href === '#notification-send-tab'));
  $(this).tab('show');
  Fliplet.Widget.autosize();
  if (href === '#notification-send-tab' || href === '#report') {
    saveButtonLabel = '';
  }
  Fliplet.Studio.emit('widget-save-label-update', {
    text: saveButtonLabel
  });
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

  data.showAutomatically = $('[name="showAutomatically"]').is(':checked');
  data.showOnceOnPortal = $('[name="showOnceOnPortal"]').is(':checked');
  data.popupTitle = $('[name="popup_title"]').val();
  data.popupMessage = $('[name="popup_message"]').val();

  Fliplet.Widget.save(data).then(function () {
    $('.settings-saved-app-msg').removeClass('hidden');
    Fliplet.Widget.autosize();
  });
});
