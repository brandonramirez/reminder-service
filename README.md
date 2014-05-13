reminder-service
================

Small library to help build a service that sends recurring reminders

What to use it for
------------------

This module simply defines a convenient interface for having a reminder service where a reminder
service is a recurring process that looks for a bunch of entities which may or may not need a
reminder action taken against them.

For example, an application which schedules tasks may want to setup reminders for overdue tasks.
This provides a microframework for looking for such tasks and updating the next scheduled run time.

Using a template method pattern, you fill in the details of how to find entities, bump their next
scheduled time and actually sending the reminder.  All of this is asynchronous, of course.

How to Use
----------

The module returns a constructor function which takes a hash of functions and configuration settings:

    var ReminderService = require('reminder-service');

    var service = new ReminderService({
      getNextReminder: function (retry, callback) {
        db.returnNextEntityForNotification(retry, callback);
      },
      bump: function (task, callback) {
        db.bumpNextNotificationTime(task, callback);
      },
      deserialize: function (nextEligibleEntity) {
        return new Task(nextEligibleInstance);
      }
    });

The properties you specify to the constructor are:

* getNextReminder: A function which takes a retry interval (in milliseconds) and a callback.  It must
  pick an item from the queue and update its next run time to be (now + retry).  If this runs in a multi-server
  environment, the find and update must be atomic (like `findAndModify` in MongoDB).  Passing `null` to
  the callback signifies no remaining work to do.
* bump: A function which updates the next run time after a reminder is successfully sent.  If you want weekly
  reminders, this is the place to set the next run time to (now + 7 days).
* deserialize: Optionally return a different object for processing that is based on the object returned from
  `getNextReminder`.  For example, if `getNextReminder` just returns a raw object from the database, you may
  build a custom object with methods attached to it here.  The default implementation just returns the input.
* remind: By default, the object returned by `deserialize` will have its `.remind` method invoked and passed
  a callback.  You can specify alternatively here what you want to do.
* intervalSeconds: When `getNextReminder` returns null, indicating no further work to do, how long shall we
  go to sleep before we wake up and look for more remidners?
* retrySeconds: When popping an item off the queue in a multi-server environment, we need to make sure
  that other servers do no pick up the same item.  Therefore, when selecting an item, also bump its next run time
  by a small interval that is quick enough that if the reminder fails, another process can pick it up and retry
  relatively quickly, but long enough that it gives enough time for the remidner to happen.

How to Install It
-----------------

    $ npm install reminder-service

That's all!

How to Develop It
-----------------

    $ git clone https://github.com/brandonramirez/reminder-service
    $ cd reminder-service
    $ npm test

`npm test` will execute the unit tests.