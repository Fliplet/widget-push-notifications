var $reportHolder = $('.reports-holder');
var source = $('#template-table-entries').html();
var jobEntriesTemplate = Handlebars.compile(source);
var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData(widgetId) || {};

function refreshReports() {
  $('#report .spinner-holder').addClass('animated');
  $('.reports-holder').addClass('hidden');
  $('.no-data').removeClass('show');
  $reportHolder.html('');
  Fliplet.Widget.autosize();

  var appPages;
  var reportData = {
    jobs: []
  };

  Fliplet.Pages.get().then(function(pages) {
    appPages = pages;
    return Promise.resolve();
  }).then(function() {
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
          deliveryPerct: 0,
          sentGoogle: 0,
          sentApple: 0,
          sentWindows: 0,
          batchesCount: log.data.jobs && log.data.jobs.length,
          batchesSent: log.data.jobs && log.data.jobs.length // this get updated further down
        };

        var apnSuccess = 0;
        var gcmSuccess = 0;
        var wnsSuccess = 0;

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

        logData.createdAt = moment(log.createdAt).format('MMM Do YYYY, HH:mm');
        logData.title = log.data.payload && log.data.payload.title;
        logData.message = log.data.payload && log.data.payload.body;
        
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

        if (log.data.payload.custom && log.data.payload.custom.data) {
          var selectedScreen = _.find(appPages, function(page) {
            return page.id === parseInt(log.data.payload.custom.data.page, 10);
          });
          if (selectedScreen) {
            logData.screenName = selectedScreen.title;
          }

          reportData.jobs.push(logData);
        }

        reportData.jobs.push(logData);
      });
      var compiledEntries;

      if (reportData.jobs.length) {
        compiledEntries = jobEntriesTemplate(reportData);
        $reportHolder.html(compiledEntries);
        $('#report .spinner-holder').removeClass('animated');
        $('.reports-holder').removeClass('hidden');
      } else {
        $('#report .spinner-holder').removeClass('animated');
        $('.no-data').addClass('show');
      }

      Fliplet.Widget.autosize();
    });
  });
}

/**
 * Method used to hide the save message
 */
function hideSavedMessage() {
  setTimeout(function() {
    $('.settings-saved-app-msg').fadeOut(function() {
      Fliplet.Widget.autosize();
    });
  }, 5000);
}

$( window ).resize(function() {
  Fliplet.Widget.autosize();
});

$('.app-name').html(Fliplet.Env.get('appName'));
new UINotification();
Fliplet.Widget.autosize();

$('.nav-tabs').on('click', 'a[data-toggle="tab"]', function(event) {
  event.preventDefault();
  var href = $(this).attr('href');
  var saveButtonLabel = 'Save';
  $('#configuration').attr('disabled', (href === '#notification-send-tab'));
  $(this).tab('show');
  if (href === '#notification-send-tab' || href === '#report') {
    saveButtonLabel = '';
  }
  Fliplet.Studio.emit('widget-save-label-update', {
    text: saveButtonLabel
  });

  Fliplet.Widget.autosize();
});

$('a#note-reports').on('shown.bs.tab', function(event) {
  event.preventDefault();
  refreshReports();
});

$('#show_link_provider').on('change', function() {
  var value = $('#show_link_provider:checked').val();

  if (value === 'on') {
    $('.link-provider-holder').removeClass('hidden');
  } else {
    $('.link-provider-holder').addClass('hidden');
  }

  Fliplet.Widget.autosize();
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

  Fliplet.Widget.save(data).then(function() {
    $('.settings-saved-app-msg').fadeIn();
    Fliplet.Widget.autosize();
    hideSavedMessage();
  });
});

Fliplet.Widget.autosize();
