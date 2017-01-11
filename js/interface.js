$('.nav-tabs').on('click', 'a[data-toggle="tab"]', function (e) {
  e.preventDefault();
  $('#configuration').attr('disabled', ($(this).attr('href') === '#send'));
  $(this).tab('show');
});

$('#configuration').submit(function (event) {
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
		constructor : UINotification,
		messageCharLimit : 235,
		notificationConfig : {},
		sendComplete : false,
		sendSuccess : false,
		sendErrorMessage : "",
		sendStatusInterval : null,
		sendToParse : true, // Use this to toggle on/off sending requests to Parse vs. a mocked transition
		debugMode : false // Use this to toggle on/off debug mode
	};

	UINotification.prototype.initUI = function() {
		// Initialise Bootstrap Switch
		$('#notification_badge').bootstrapSwitch().on( 'switchChange.bootstrapSwitch', function(){
			if ( $(this).is(':checked') ) {
				$('#notification-badge-icon').addClass('checked');
			} else {
				$('#notification-badge-icon').removeClass('checked');
			}
		} );

		// Initialise Bootstrap Datetime Picker
		$('#datetimepicker').datetimepicker({
			inline: true,
			sideBySide: true,
			defaultDate: moment(new Date()).add(1, 'hours')
		});

		// Initialise message preview
		_this.onNotificationMessageUpdated();

		// _this.initialiseParse();
	};

	UINotification.prototype.initialiseParse = function() {
		try {
			var parseApplicationID = $('#parse_application_id').val();
			var parseJavaScriptKey = $('#parse_javascript_key').val();
			Parse.initialize(parseApplicationID, parseJavaScriptKey);
		} catch (err) {
			throw( "Unable to initialise Parse" );
		}
	};

	UINotification.prototype.attachObservers = function() {
		// Notification message character limit countdown
		$(document).on( 'keyup paste input blur change', '#notification-send textarea', _this.onNotificationMessageUpdated );

		// Sets up callback for activating notification send modal
		$(document).on( 'click', '#notification-confirm', _this.initialiseNotificationConfirmationModal );

		// Sets up callback for sending notification to Parse
		$(document).on( 'click', '.notification-send', _this.startNotificationSend );

		// Sets up callback for sending another notification
		$(document).on( 'click', '#notification-send-another', _this.resetNotificationForm )
	};

	UINotification.prototype.onNotificationMessageUpdated = function() {
		var $field = $('#notification-send textarea');
		$('#notification-message-preview .notification-message').html($field.val());
		if ( !$field.val().length ) {
			$('#notification-message-preview').addClass('message-empty');
		} else {
			$('#notification-message-preview').removeClass('message-empty');
		}
		_this.refreshMessageCharCount($field);
	};

	UINotification.prototype.refreshMessageCharCount = function($field) {
		var charLimit = _this.messageCharLimit;
		var count = $field.val().length;
		$('#count').html(charLimit - count);
		if (count > charLimit) {
			$('#countlabel').addClass('text-danger').removeClass('text-success');
			$field.parents('.form-group').addClass('has-error');
		} else {
			$('#countlabel').removeClass('text-danger').addClass('text-success');
			$field.parents('.form-group').removeClass('has-error');
		}
	};

	UINotification.prototype.notificationConfigurationIsValid = function() {
		/**
		 * Notification configuration is valid if:
		 *
		 *	- Message is not above character limit
		 *	- Message is non-empty or icon badge is enabled
		 *	- Schedule option is 'asap' or 'scheduled'
		 *	- Scheduled date is at least 5 minutes or later from now
		 *
		 **/

		var configurationIsValid = true;

		var notificationMessage = $('#notification_message').val();
		if ( notificationMessage.length > _this.messageCharLimit ) {
			configurationIsValid = false;
		}

		if ( notificationMessage.length === 0 && !$('#notification_badge').is(':checked') ) {
			configurationIsValid = false;
		}

		var notificationScheduleOption = $('#schedule-options > li.active:eq(0)').data('option');
		if ( notificationScheduleOption !== 'asap' && notificationScheduleOption !== 'scheduled' ) {
			configurationIsValid = false;
		}

		if ( notificationScheduleOption === 'scheduled' ) {
			var scheduleDate = moment( new Date( $('#datetimepicker').find('input').val() ) );
			var now = moment();
			if ( scheduleDate.diff(now, 'days') < -1 ) {
				configurationIsValid = false;
			}
		}

		return configurationIsValid;
	};

	UINotification.prototype.initialiseNotificationConfirmationModal = function(e) {
		if ( !_this.notificationConfigurationIsValid() ) {
			return;
		}
		// Populate notification message
		var notificationMessage = $('#notification_message').val();
		if ( notificationMessage === '' ) {
			$('#notification-summary-not-receive-message').show();
			$('#notification-summary-receive-message').hide();
		} else {
			$('#notification-summary-message').html(notificationMessage);
			$('#notification-summary-not-receive-message').hide();
			$('#notification-summary-receive-message').show();
		}

		// Populate notification badge increment
		if ( $('#notification_badge').is(':checked') ) {
			$('#notification-summary-badge-not').hide();
		} else {
			$('#notification-summary-badge-not').show();
		}

		// Populate notification schedule
		switch ( $('#schedule-options > li.active:eq(0)').data('option') ) {
			case 'asap':
				$('#notification-summary-schedule').html('ASAP');
				break;
			case 'scheduled':
				var scheduleDate = moment( new Date( $('#datetimepicker').find('input').val() ) );
				var dateString = scheduleDate.format('Do MMM YYYY');
				var timeString = scheduleDate.format('hh:mm A');
				var timezoneString = $.trim( $( 'label[for=' + $(':input[name=notification_timezone]:checked').attr('id') + ']' ).text() );
				$('#notification-summary-schedule').html('<br/>on ' + dateString + ' at ' + timeString + ' (' + timezoneString + ')');
				break;
		}

		if ( window.notificationEnabled ) {
			$('#notification-confirm-modal').modal('show').attr('data-mode','confirm');
			$("body").data("modalmanager").getOpenModals().pop().layout();
		} else {
			$('#notification-contact-modal').modal('show');
		}
	};

	UINotification.prototype.initialiseNotificationConfiguration = function() {
		/**
		 * See https://www.parse.com/docs/js/guide#push-notifications for more configuration options
		 *
		 * @param alert		String
		 * @param badge		String Set as "Increment" to increase iOS icon badge by 1
		 * @param push_time Date
		 *
		 **/
		var everyoneQuery = new Parse.Query(Parse.Installation);
		_this.notificationConfig = { where: everyoneQuery, data: {} };
		if ( $('#notification_message').val() !== '' ) {
			_this.notificationConfig.data.alert = $('#notification_message').val();
		}
		if ( $('#notification_badge').is(':checked') === true ) {
			_this.notificationConfig.data.badge = 'Increment';
		}
		if ( $('#schedule-options > li.active:eq(0)').data('option') === 'scheduled' ) {
			_this.notificationConfig.push_time = moment( new Date( $('#datetimepicker').find('input').val() ) ).format('YYYY-MM-DDTHH:mm:ss');
			if ( $( 'label[for=' + $(':input[name=notification_timezone]:checked').attr('id') + ']' ).index('#notification-scheduled .btn-group-vertical label') === 1 ) {
				_this.notificationConfig.push_time += '+00:00';
			}
		}

		if ( _this.debugMode ) {
			console.log(_this.notificationConfig);
		}
	};

	UINotification.prototype.startNotificationSend = function() {
		// Prepare variables
		_this.initialiseNotificationConfiguration();
		// Send request to Parse
		_this.sendNotification();
	};

	UINotification.prototype.sendNotification = function(){
		_this.sendComplete = false;
		_this.sendErrorMessage = "";
		if ( _this.sendToParse ) {
			Parse.Push.send(_this.notificationConfig, {
				success: function() {
					// Push was successful
					_this.sendSuccess = true;
					_this.sendComplete = true;
				},
				error: function(error) {
					// Handle error
					_this.sendSuccess = false;
					_this.sendComplete = true;
					_this.sendErrorMessage = "Error: " + error.message;
				}
			});
		} else {
			var success = true;
			if (success) {
				_this.sendSuccess = true;
				_this.sendComplete = true;
			} else {
				_this.sendSuccess = false;
				_this.sendComplete = true;
				_this.sendErrorMessage = "Error: Debug Mode";
			}
		}
		$('#notification-confirm-modal .notification-summary-sending .progress-bar').width('0%');
		$('#notification-confirm-modal').attr('data-mode','sending');
		$("body").data("modalmanager").getOpenModals().pop().layout();
		$('#notification-confirm-modal .notification-summary-sending .progress-bar').width('90%');
		setTimeout(function(){
			_this.sendStatusInterval = setInterval(function(){
				if ( _this.sendComplete ) {
					clearInterval(_this.sendStatusInterval);
					$('#notification-confirm-modal .notification-summary-sending .progress-bar').width('100%');
					setTimeout(function(){
						if ( _this.sendSuccess ) {
							_this.notificationIsSent();
						} else {
							_this.notificationIsNotSent();
						}
					}, 650);
				}
			}, 100);
		}, 1000);
	};

	UINotification.prototype.notificationIsSent = function() {
		$('#notification-confirm-modal').attr('data-mode','sent');
		$("body").data("modalmanager").getOpenModals().pop().layout();
	};

	UINotification.prototype.notificationIsNotSent = function() {
		if ( _this.sendErrorMessage.length ) {
			$('#notification-error-message').html(_this.sendErrorMessage);
			$('#notification-error-container').show();
		} else {
			$('#notification-error-container').hide();
		}

		$('#notification-confirm-modal').attr('data-mode','error');
		$("body").data("modalmanager").getOpenModals().pop().layout();
	};

	UINotification.prototype.resetNotificationForm = function() {
		$('#notification_message').val('');
		$("body").data("modalmanager").getOpenModals().pop().hide();
		$('#notification-confirm-modal').attr('data-mode','confirm');
		$('#notification-send .modal-body').scrollTop(0);
		$('#notification-message-preview').addClass('message-empty');
		return false;
	};

	return UINotification;
})();

/***************  END: UINotification  ***************/
/***************  END: UINotification  ***************/
/***************  END: UINotification  ***************/

new UINotification();
