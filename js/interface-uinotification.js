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
    subscriptionsCount: 0,
    mockedRequest: Fliplet.Env.get('development'), // Use a mocked request under development environment
    linkActionProvider: {},
    linkData: {
      action: 'screen',
      page: '',
      transition: 'slide.left',
      options: {
        hideAction: true
      }
    },
    linkSavedData: {},
    toSendNotification: false
  };

  UINotification.prototype.initUI = function() {
    Fliplet.App.Subscriptions.get().then(function(subscriptions) {
      _this.subscriptionsCount = subscriptions.length;
      if (_this.subscriptionsCount === 0) {
        $('#subscription-note').html('No devices are registered to receive this notification.');
        $('#subscription-note').addClass('text-danger');
      } else {
        $('#subscriptions').html(_this.subscriptionsCount);
      }
    });

    // Initialise the link provider
    _this.linkProviderInit();

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
    $(document).on('click', '.notification-send', function(event){
      event.preventDefault();
      _this.sendErrorMessage = "";
      var title = $('#notification_title').val();
      var body = $('#notification_message').val();
      var hasErrors = false;

      // Reset error messages
      $('.notification_title_error').addClass('hidden');
      $('.notification_message_error').addClass('hidden');

      if (!title) {
        $('.notification_title_error').removeClass('hidden');
        hasErrors = true;
      }
      if (!body) {
        $('.notification_message_error').removeClass('hidden');
        hasErrors = true;
      }
      if (hasErrors) {
        return;
      }

      // Add subscription count to HTML
      $('.subscriptions-count').html(_this.subscriptionsCount);
      // Get HTML for modal
      var html = $('.notifications-preview').html();
      // Open Modal
      Fliplet.Modal.confirm({
        title: 'Notification preview',
        message: html,
        buttons: {
          confirm: {
            label: 'Send notification'
          }
        }
      }).then(function (result) {
        if (result) {
          _this.toSendNotification = true;
          _this.linkActionProvider.forwardSaveRequest();
        }
      });
    });
    $(document).on('click', '.notification-cancel', _this.cancelNotificationSend);
    $(document).on('click', '.preview-target-screen', function(event) {
      event.preventDefault();
      $('.screen-error').addClass('hidden');
      _this.linkActionProvider.forwardSaveRequest();
    });
    $(document).on('click', '.more-details a', function(e) {
      e.preventDefault();
      var _this = $(this);
      var placeHodlerEl = '<div class="report-placeholder-element"></div>';

      if (!$(this).parents('.report-wrapper').hasClass('show-more')) {
        $('.reports-holder').append(placeHodlerEl);
        Fliplet.Widget.autosize();
      }
      
      setTimeout(function() {
        $('.report-placeholder-element').remove();
        _this.parents('.report-wrapper').toggleClass('show-more');

        if (_this.parents('.report-wrapper').hasClass('show-more')) {
          _this.text('See less details');
        } else {
          _this.text('See more details');
        }
      }, 0);

      // Wait for CSS animation to finish before running
      setTimeout(function() {
        Fliplet.Widget.autosize();
      }, 500);
    });

    // Sets up callback for sending another notification
    // $(document).on( 'click', '#notification-send-tab-another', _this.resetNotificationForm )
  };

  UINotification.prototype.linkProviderInit = function() {
    _this.linkActionProvider = Fliplet.Widget.open('com.fliplet.link', {
      // If provided, the iframe will be appended here,
      // otherwise will be displayed as a full-size iframe overlay
      selector: '#link-provider',
      // Also send the data I have locally, so that
      // the interface gets repopulated with the same stuff
      data: _this.linkData,
      closeOnSave: false
    });

    // Fired when the provider has finished
    _this.linkActionProvider.then(function (result) {
      _this.linkSavedData.action = result.data;

      if (_this.toSendNotification) {
        _this.toSendNotification = false;
        _this.startNotificationSend();
        return;
      }

      if (!result.data || !result.data.page) {
        $('.screen-error').removeClass('hidden');
        return;
      }

      _this.openPreviewOverlay();
    });
  }

  UINotification.prototype.openPreviewOverlay = function() {
    Fliplet.Studio.emit('overlay', {
      name: 'page-preview',
      options: {
        size: 'medium',
        title: 'Previewing target screen',
        classes: 'preview-notification',
        data: {
          appId: Fliplet.Env.get('appId'),
          pageId: _this.linkSavedData.action.page,
          query: _this.linkSavedData.action.query
        }
      }
    });
  }

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
      _this.notificationConfig.push_time = moment(new Date($('#datetimepicker').find('input').val())).format('YYYY-MM-DDTHH:mm');
      if ($('label[for=' + $(':input[name=notification_timezone]:checked').attr('id') + ']').index('#notification-scheduled .btn-group-vertical label') === 1) {
        _this.notificationConfig.push_time += '+00:00';
      }
    }
  };

  UINotification.prototype.startNotificationSend = function() {
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
    var title = $('#notification_title').val();
    var body = $('#notification_message').val();
    var data = {
      title: title,
      body: body,
      badge: 1
    };

    // Check if page is set for deep linking
    if ($('#show_link_provider').is(":checked") && _this.linkSavedData.action && _this.linkSavedData.action.page) {
      data.custom = {
        data: _this.linkSavedData.action
      }
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



    return Fliplet.App.PushNotifications.send(data);
  };

  UINotification.prototype.notificationIsSent = function() {
    $('#notification-send-tab').attr('data-mode', 'sent');
    $('.notification-summary-sending .progress-bar').width('100%');
    Fliplet.Modal.alert({
      title: 'Notification sent',
      message: 'Your notification has been sent.'
    });
    $('#notification_title, #notification_message').val('');
    $('#notification-send-tab').attr('data-mode', '');
  };

  UINotification.prototype.notificationIsNotSent = function() {
    $('#notification-send-tab').attr('data-mode', 'error');
    $('.notification-summary-sending .progress-bar').width('100%');
    if (!_this.sendErrorMessage.length) {
      _this.sendErrorMessage = 'There was an error sending your notification';
    }
    Fliplet.Modal.alert({
      title: 'Error',
      message: _this.sendErrorMessage
    });
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
