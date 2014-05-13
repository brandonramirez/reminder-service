var DEFAULT_INTERVAL_SECONDS = 600;
var DEFAULT_RETRY_DELAY_SECONDS = 15;

/**
 * Assumptions:
 *
 * 1. In a multi-server environment, all servers' clocks are synchronized.
 * 2. The implementation of getNextReminder pushes out the next run time and reads the object atomically.
 */
module.exports = function ReminderService(options) {
  options = options || {};

  if (options.getNextReminder) {
    this.getNextReminder = options.getNextReminder;
  }
  if (options.bump) {
    this.bump = options.bump;
  }
  if (options.deserialize) {
    this.deserialize = options.deserialize;
  }
  if (options.remind) {
    this.remind = options.remind;
  }
  this.intervalSeconds = options.intervalSeconds || DEFAULT_INTERVAL_SECONDS;
  this.retryDelaySeconds = options.retryDelaySeconds || DEFAULT_RETRY_DELAY_SECONDS;
};

module.exports.prototype = {
  running: false,

  run: function () {
    var self = this;

    this.getNextReminder(this.retryDelaySeconds * 1000, function (err, nextEligibleEntity) {
      if (nextEligibleEntity == null && self.running) {
        setTimeout(self.run.bind(self), self.intervalSeconds * 1000);
      }
      else {
        var entity = self.deserialize(nextEligibleEntity);

        self.remind(entity, function () {
          self.bump(entity, function () {
            if (self.running) {
              self.run();
            }
          });
        });
      }
    });
  },

  start: function (delay) {
    delay = delay || 0;  // null or undefined should be treated as 0 or "run now".

    this.running = true;
    setTimeout(this.run.bind(this), delay);
    return this;
  },

  /**
   * This is a passive abort.  Work currently in progress will finish, but once the reminder completes,
   * we stop scanning for more work to do.
   */
  abort: function () {
    this.running = false;
    return this;
  },

  getNextReminder: function (retry, cb) {
    if (cb) {
      cb();
    }
  },

  /**
   * Optional hook to take the object returned by `getNextReminder` and convert it to a different type.
   * Useful if `getNextReminder` returns only state information from a database and needs to be
   * deserialized to a business object.
   *
   * The default implementation returns the same object with no changes.
   *
   * @param obj Raw object
   * @return Deserialized object
   */
  deserialize: function (obj) {
    return obj;
  },

  /**
   * Stub method for bumping a reminder - to be over-ridden
   */
  bump: function (obj, cb) {
    if (cb) {
      cb();
    }
  },

  remind: function (entity, cb) {
    entity.remind(cb);
  }
};