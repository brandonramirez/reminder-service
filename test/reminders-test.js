var vows = require('vows');
var assert = require('assert');

var ReminderService = require('../index.js');

var suite = vows.describe('reminder service');

var now = new Date();
var yesterday = new Date();
yesterday.setUTCDate(now.getUTCDate() - 1);
var tomorrow = new Date();
tomorrow.setUTCDate(now.getUTCDate() + 1);

var lifecycleTestEntities = [{
  name: 'something something dark side',
  nextReminderTime: now,
  reminderSent: false
}, {
  name: 'something something complete',
  nextReminderTime: now,
  reminderSent: false
}];

var reminderFlowTestEntities = [{
  name: 'some thing to do',
  nextReminderTime: yesterday,
  reminderSent: false
}, {
  name: 'some other task',
  nextReminderTime: now,
  reminderSent: false
}, {
  name: 'Tomorrow\'s work',
  nextReminderTime: tomorrow,
  reminderSent: false
}];

suite.addBatch({
  'lifecycle': {
    topic: new ReminderService({
      intervalSeconds: 2,  // over-ride the default to 2 seconds otherwise this will be a very long test...
      retryDelaySeconds: 1,

      getNextReminder: function (retry, callback) {
        var matchingEntities = lifecycleTestEntities.filter(function (entity) {
          return entity.nextReminderTime.getTime() <= now.getTime();
        });
        if (matchingEntities.length > 0) {
          callback(null, matchingEntities[0]);
        }
        else {
          callback();
        }
      },

      bump: function (entity, callback) {
        entity.nextReminderTime.setUTCHours(now.getUTCHours() + 1);
        setTimeout(callback, 0);
      },

      remind: function (entity, callback) {
        entity.reminderSent = true;
        setTimeout(callback, 0);
      }
    }).start()
      .abort(),

    'first item process': {
      topic: function (service) {
        setTimeout(this.callback, 1500);
      },
      'first reminder sent': function () {
        assert.isTrue(lifecycleTestEntities[0].reminderSent);
      },
      'second reminder NOT sent': function () {
        assert.isFalse(lifecycleTestEntities[1].reminderSent);
      }
    }
  },

  'reminder flow': {
    topic: new ReminderService({
      intervalSeconds: 2,  // over-ride the default to 2 seconds otherwise this will be a very long test...
      retryDelaySeconds: 1,

      getNextReminder: function (retry, callback) {
        var matchingEntities = reminderFlowTestEntities.filter(function (entity) {
          return entity.nextReminderTime.getTime() <= now.getTime();
        });
        if (matchingEntities.length > 0) {
          callback(null, matchingEntities[0]);
        }
        else {
          callback();
        }
      },

      bump: function (entity, callback) {
        entity.nextReminderTime = tomorrow;
        setTimeout(callback, 0);
      },

      remind: function (entity, callback) {
        entity.reminderSent = true;
        setTimeout(callback, 0);
      }
    }).start(),

    'first item processed': {
      topic: function (service) {
        setTimeout(this.callback, 1500);
      },
      'Reminder sent': function () {
        assert.isTrue(reminderFlowTestEntities[0].reminderSent);
      },
      'Next reminder date bumped': function () {
        assert.isTrue(reminderFlowTestEntities[0].nextReminderTime > now);
      }
    },

    'second item processed': {
      topic: function (service) {
        setTimeout(this.callback, 1500);
      },
      'Reminder sent': function () {
        assert.isTrue(reminderFlowTestEntities[1].reminderSent);
      },
      'Next reminder date bumped': function () {
        assert.isTrue(reminderFlowTestEntities[1].nextReminderTime > now);
      }
    },

    'third item NOT processed': {
      topic: function (service) {
        setTimeout(this.callback, 1500);
      },
      'Reminder sent': function () {
        assert.isFalse(reminderFlowTestEntities[2].reminderSent);
      },
      'Next reminder date bumped': function () {
        assert.isTrue(reminderFlowTestEntities[2].nextReminderTime > now);
      }
    }
  }
});

suite.export(module);
