var $tbody = $('#jobs-entries');
var source = $('#template-table-entries').html();
var jobEntriesTemplate = Handlebars.compile(source);

function refreshReports() {
  $('#report .spinner-holder').addClass('animated');
  $('.table-holder').addClass('hidden');
  $('.no-data').removeClass('show');
  $tbody.html('');

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
        sentWindows: '',
        dataSourceName: ''
      }

      var apnSuccess = 0;
      var gcmSuccess = 0;
      var wnsSuccess = 0;
      var apn = 0;
      var gcm = 0;
      var wns = 0;

      customJob.createdAt = moment(job.createdAt).format('YYYY/MM/DD, hh:mm:ss');
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
      customJob.dataSourceName = job.dataSourceEntry && job.dataSourceEntry.dataSource ? job.dataSourceEntry.dataSource.name : "Data source was deleted";

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

$('.nav-tabs').on('click', 'a[data-toggle="tab"]', function(e) {
  e.preventDefault();
  $('#configuration').attr('disabled', ($(this).attr('href') === '#send'));
  $(this).tab('show');
  Fliplet.Widget.autosize();
});

$('a#note-reports').on('shown.bs.tab', function(e) {
  refreshReports();
});

$('.tab-pane#report .refresh').on('click', function() {
  refreshReports();
});

$('#configuration').submit(function(event) {
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

Fliplet.Navigator.onReady().then(function() {
  Fliplet.Widget.autosize();
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function() {
  $('form').submit();
});

/*****************  UINotification  *****************/
/*****************  UINotification  *****************/
/*****************  UINotification  *****************/

var UINotification = (function() {
  // this reference
  var _this;

  // Constructor
  function UINotification() {
    _this = this;
    _this.initUI();
    _this.attachObservers();
  }

  UINotification.prototype = {
    constructor: UINotification,
    titleCharLimit: 50,
    messageCharLimit: 235,
    notificationConfig: {},
    sendErrorMessage: '',
    mockedRequest: Fliplet.Env.get('development') // Use a mocked request under development environment
  };

  UINotification.prototype.initUI = function() {
    Fliplet.App.Subscriptions.get().then(function(subscriptions) {
      if (subscriptions.length === 0) {
        $('#subscription-note').html('There are no devices registered to receive this notification.');
        $('#subscription-note').addClass('text-danger');
      } else {
        $('#subscriptions').html(subscriptions.length);
      }
    });

    // Initialise message preview
    _this.onNotificationMessageUpdated();

    // Initialise Bootstrap Switch
    $('#notification_badge').bootstrapSwitch().on('switchChange.bootstrapSwitch', function() {
      if ($(this).is(':checked')) {
        $('#notification-badge-icon').addClass('checked');
      } else {
        $('#notification-badge-icon').removeClass('checked');
      }
    });

    // Initialise Bootstrap Datetime Picker
    $('#datetimepicker').datetimepicker({
      inline: true,
      sideBySide: true,
      defaultDate: moment(new Date()).add(1, 'hours')
    });
  };

  UINotification.prototype.attachObservers = function() {
    // Notification message character limit countdown
    $(document).on('keyup paste input blur change', '#notification_title, #notification_message', _this.onNotificationMessageUpdated);

    // Sets up callback for activating notification send modal
    // $(document).on( 'click', '#notification-confirm', _this.initialiseNotificationConfirmationModal );

    // Sets up callback for sending/cancelling notification sending
    $(document).on('click', '.notification-send', _this.startNotificationSend);
    $(document).on('click', '.notification-cancel', _this.cancelNotificationSend);

    // Sets up callback for sending another notification
    // $(document).on( 'click', '#notification-send-tab-another', _this.resetNotificationForm )
  };

  UINotification.prototype.onNotificationMessageUpdated = function() {
    var $titleField = $('#notification_title');
    var $messageField = $('#notification_message');

    var previewHtml = '';
    if ($titleField.val().length) {
      previewHtml += `<strong>${$titleField.val()}</strong>`;
    }
    previewHtml += $messageField.val();

    $('#notification-message-preview .notification-message').html(previewHtml);
    if (!$titleField.val().length && !$messageField.val().length) {
      $('#notification-message-preview').addClass('message-empty');
    } else {
      $('#notification-message-preview').removeClass('message-empty');
    }
    _this.refreshCharCount($titleField, _this.titleCharLimit);
    _this.refreshCharCount($messageField, _this.messageCharLimit);
  };

  UINotification.prototype.refreshCharCount = function($field, charLimit) {
    var count = $field.val().length;
    var $countContainer = $($field.data('countSelector'));
    var $countLabel = $countContainer.parents('countlabel');
    $countContainer.html(charLimit - count);
    if (count > charLimit) {
      $countLabel.addClass('text-danger').removeClass('text-success');
      $field.parents('.form-group').addClass('has-error');
    } else {
      $countLabel.removeClass('text-danger').addClass('text-success');
      $field.parents('.form-group').removeClass('has-error');
    }
  };

  UINotification.prototype.notificationConfigurationIsValid = function() {
    /**
     * Notification configuration is valid if:
     *
     *  - Message is not above character limit
     *  - Message is non-empty or icon badge is enabled
     *  - Schedule option is 'asap' or 'scheduled'
     *  - Scheduled date is at least 5 minutes or later from now
     *
     **/

    var configurationIsValid = true;

    var notificationMessage = $('#notification_message').val();
    if (notificationMessage.length > _this.messageCharLimit) {
      configurationIsValid = false;
    }

    if (notificationMessage.length === 0 && !$('#notification_badge').is(':checked')) {
      configurationIsValid = false;
    }

    var notificationScheduleOption = $('#schedule-options > li.active:eq(0)').data('option');
    if (notificationScheduleOption !== 'asap' && notificationScheduleOption !== 'scheduled') {
      configurationIsValid = false;
    }

    if (notificationScheduleOption === 'scheduled') {
      var scheduleDate = moment(new Date($('#datetimepicker').find('input').val()));
      var now = moment();
      if (scheduleDate.diff(now, 'days') < -1) {
        configurationIsValid = false;
      }
    }

    return configurationIsValid;
  };

  UINotification.prototype.initialiseNotificationConfirmationModal = function(e) {
    // @NOTE: Currently not used (copied from legacy UI)

    if (!_this.notificationConfigurationIsValid()) {
      return;
    }
    // Populate notification message
    var notificationMessage = $('#notification_message').val();
    if (notificationMessage === '') {
      $('#notification-summary-not-receive-message').show();
      $('#notification-summary-receive-message').hide();
    } else {
      $('#notification-summary-message').html(notificationMessage);
      $('#notification-summary-not-receive-message').hide();
      $('#notification-summary-receive-message').show();
    }

    // Populate notification badge increment
    if ($('#notification_badge').is(':checked')) {
      $('#notification-summary-badge-not').hide();
    } else {
      $('#notification-summary-badge-not').show();
    }

    // Populate notification schedule
    switch ($('#schedule-options > li.active:eq(0)').data('option')) {
      case 'asap':
        $('#notification-summary-schedule').html('ASAP');
        break;
      case 'scheduled':
        var scheduleDate = moment(new Date($('#datetimepicker').find('input').val()));
        var dateString = scheduleDate.format('Do MMM YYYY');
        var timeString = scheduleDate.format('hh:mm A');
        var timezoneString = $.trim($('label[for=' + $(':input[name=notification_timezone]:checked').attr('id') + ']').text());
        $('#notification-summary-schedule').html('<br/>on ' + dateString + ' at ' + timeString + ' (' + timezoneString + ')');
        break;
    }

    $('#notification-send-tab').attr('data-mode', 'confirm');
    $("body").data("modalmanager").getOpenModals().pop().layout();
  };

  UINotification.prototype.initialiseNotificationConfiguration = function() {
    /**
     * See https://www.parse.com/docs/js/guide#push-notifications for more configuration options
     *
     * @param alert   String
     * @param badge   String Set as "Increment" to increase iOS icon badge by 1
     * @param push_time Date
     *
     **/
    var everyoneQuery = new Parse.Query(Parse.Installation);
    _this.notificationConfig = {
      where: everyoneQuery,
      data: {}
    };
    if ($('#notification_message').val() !== '') {
      _this.notificationConfig.data.alert = $('#notification_message').val();
    }
    if ($('#notification_badge').is(':checked') === true) {
      _this.notificationConfig.data.badge = 'Increment';
    }
    if ($('#schedule-options > li.active:eq(0)').data('option') === 'scheduled') {
      _this.notificationConfig.push_time = moment(new Date($('#datetimepicker').find('input').val())).format('YYYY-MM-DDTHH:mm:ss');
      if ($('label[for=' + $(':input[name=notification_timezone]:checked').attr('id') + ']').index('#notification-scheduled .btn-group-vertical label') === 1) {
        _this.notificationConfig.push_time += '+00:00';
      }
    }
  };

  UINotification.prototype.startNotificationSend = function(e) {
    e.preventDefault();
    // Prepare Parse variables (legacy)
    // _this.initialiseNotificationConfiguration();

    $('#notification-send-tab').attr('data-mode', 'confirm');
    // Send request
    _this.sendNotification()
      .then(function() {
        // Push was successful
        _this.notificationIsSent();
      })
      .catch(function(error) {
        // Handle error
        var msg = error.responseJSON && error.responseJSON.message || error.message || error;
        _this.sendErrorMessage = "Error: " + msg;
        _this.notificationIsNotSent();
      });
  };

  UINotification.prototype.cancelNotificationSend = function() {
    $('[href="#settings"]').tab('show');
    $('#notification-send-tab textarea').val('');
    _this.onNotificationMessageUpdated();
    $('#notification-send-tab').attr('data-mode', '');
  };

  UINotification.prototype.sendNotification = function() {
    _this.sendErrorMessage = "";
    var title = $('#notification_title').val();
    var body = $('#notification_message').val();
    if (!title || !body) {
      _this.sendErrorMessage = 'Please enter your notification message';
      return Promise.reject({
        message: _this.sendErrorMessage
      });
    }

    // Reset progress bar
    $('.notification-summary-sending .progress-bar').width('0%');
    $('#notification-send-tab').attr('data-mode', 'sending');
    // Set progress bar to UI to provide visual user feedback
    $('.notification-summary-sending .progress-bar').width('90%');

    if (_this.mockedRequest) {
      return new Promise(function(resolve, reject) {
        var mockSuccessResponse = false;
        if (mockSuccessResponse) {
          return resolve();
        }
        return reject({
          message: 'Mocked error response'
        });
      });
    }

    return Fliplet.App.PushNotifications.send({
      title: title,
      body: body,
      badge: 1
    });
  };

  UINotification.prototype.notificationIsSent = function() {
    $('#notification-send-tab').attr('data-mode', 'sent');
    $('.notification-summary-sending .progress-bar').width('100%');
    alert('Your notification has been sent');
    $('#notification_title, #notification_message').val('');
    $('#notification-send-tab').attr('data-mode', '');
  };

  UINotification.prototype.notificationIsNotSent = function() {
    $('#notification-send-tab').attr('data-mode', 'error');
    $('.notification-summary-sending .progress-bar').width('100%');
    if (!_this.sendErrorMessage.length) {
      _this.sendErrorMessage = 'There was an error sending your notification';
    }
    alert(_this.sendErrorMessage);
    $('#notification-send-tab').attr('data-mode', '');
  };

  UINotification.prototype.resetNotificationForm = function() {
    $('#notification_title, #notification_message').val('');
    $('#notification-send-tab').attr('data-mode', 'confirm');
    $('#notification-message-preview').addClass('message-empty');
    setTimeout(_this.onNotificationMessageUpdated, 0);
    return false;
  };

  return UINotification;
})();

/***************  END: UINotification  ***************/
/***************  END: UINotification  ***************/
/***************  END: UINotification  ***************/

new UINotification();
