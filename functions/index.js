require('@google-cloud/debug-agent').start({allowExpressions: true});
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const dateFormat = require('dateformat');

admin.initializeApp(functions.config().firebase);
const database = admin.database();

exports.createTicketNumber = functions.database.ref('/ticketing/{ticketId}')
    .onWrite(event => {
        const ticket = event.data.val();
        if (ticket) {
            var promise = new Promise(function (resolve, reject) {
                getTicketNumber(function (ticketNumber) {
                    resolve();
                    // if (ticketNumber === -1) {
                    //     return null;
                    // }
                    // ticket.ticketNumber = ticketNumber;
                    // // You must return a Promise when performing asynchronous tasks inside a Functions such as
                    // // writing to the Firebase Realtime Database.
                    // // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
                    // //return event.data.ref.parent.child('uppercase').set(uppercase);
                    // resolve(event.data.adminRef.update(
                    //     ticket
                    // ));
                })
            });

            return promise.then(p1 => console.log('Task Completed'))
        }
    });

function getTicketNumber(callback) {
    var ref = database.ref("ticketing");
    var tickets = [];
    // Attach an asynchronous callback to read the data at our posts reference
    ref.once('value', function (snapshot) {
        snapshot.forEach(function (childSnap) {
            tickets.push(childSnap.val());
        });
        callback(formatTicketNumber(getLastTicketNumber(tickets) + 1));
        calculateAnalytics(tickets);
    }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
        callback(-1);
    });
}

function getLastTicketNumber(tickets) {
    // for (i = tickets.length - 1; i >= 0; i--) {
    //     if (tickets[i].ticketNumber) {
    //         return tickets[i].ticketNumber;
    //     }
    // }
    return 0;
}

function formatTicketNumber(ticketCount) {
    if (ticketCount.length === 1) {
        return "0000" + ticketCount;
    } else if (ticketCount.length === 2) {
        return "000" + ticketCount;
    } else if (ticketCount.length === 3) {
        return "00" + ticketCount;
    } else if (ticketCount.length === 4) {
        return "0" + ticketCount;
    }
    return ticketCount + "";
}

function updateAnalytics(tickets) {
    var ref = database.ref("analytics");
    // Attach an asynchronous callback to read the data at our posts reference
    ref.once('value', function (snapshot) {
        calculateAnalytics(snapshot.val(), tickets);
    }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
    });
}

function calculateAnalytics(tickets) {
    var myMap = new Map();
    tickets.forEach(function(ticket){
        var tDate = formatTicketDate(ticket.dateTime);
        if(myMap(tDate)){
            tArray = myMap(tDate);
            tArray.push(ticket);
            myMap.set(tDate, tArray);
        }else{
            var tArray = [];
            tArray.push(ticket);
            myMap.set(tDate, tArray);
        }
    });
    const todaysDate = dateFormat(new Date(), "mm-dd-yyyy");
    var incomingCount = 0, dispatchedCount = 0, approvalCount = 0, approvedCount = 0, sceduledCount = 0,
        workCompletedCount = 0, workRatedCount = 0;
    var highCount = 0, mediumCount = 0, lowCount = 0;
    var highOpen = 0, highClose = 0, medOpen = 0, medClose = 0, lowOpen = 0, lowClose = 0;

    tickets.forEach(function (ticket) {
        var isOpen = true;
        if (todaysTicket(ticket, todaysDate)) {
            switch (ticket.status) {
                case "Incoming":
                    incomingCount++;
                    break;
                case "Assigned":
                    dispatchedCount++;
                    break;
                case "Approver Assigned":
                    approvalCount++;
                    break;
                case "Approved":
                    approvedCount++;
                    break;
                case "Scheduled":
                    sceduledCount++;
                    break;
                case "Work Completed":
                    isOpen = false;
                    workCompletedCount++;
                    break;
                case "WorkRated":
                    isOpen = false;
                    workRatedCount++;
                    break;
                default:
                    break;
            }

            switch (ticket.priority) {
                case "HIGH":
                    highCount++;
                    if(isOpen){
                        highOpen++;
                    }else{
                        highClose++;
                    }
                    break;
                case "MEDIUM":
                    mediumCount++;
                    if(isOpen){
                        medOpen++;
                    }else{
                        medClose++;
                    }
                    break;
                case "LOW":
                    lowCount++;
                    if(isOpen){
                        lowOpen++;
                    }else{
                        lowClose++;
                    }
                    break;
                default:
                    break;
            }
        }
    })

    analytic.analyticsDate = todaysDate;
    analytic.incomingCount = incomingCount;
    analytic.dispatchedCount = dispatchedCount;
    analytic.approvalCount = approvalCount;
    analytic.approvedCount = approvedCount;
    analytic.scheduleCount = sceduledCount;
    analytic.workCompletedCount = workCompletedCount;
    analytic.workRatedCount = workRatedCount;

    analytic.highCount = highCount;
    analytic.mediumCount = mediumCount;
    analytic.lowCount = lowCount;

    let ref = database.ref("analytics/"+todaysDate+"");
    ref.set(analytic);
}

function formatTicketDate(ticketDate){
    return dateFormat(ticketDate, "mm-dd-yyyy");
}

function todaysTicket(ticket, todaysDate) {
    return (formatTicketDate(ticket.dateTime) === todaysDate);
}

let analytic = {
    "analyticsDate": "",
    "approvalCount": 0,
    "approvedCount": 0,
    "dispatchedCount": 0,
    "incomingCount": 0,
    "scheduleCount": 0,
    "workCompletedCount": 0,
    "workRatedCount": 0,
    "highCount": 0,
    "mediumCount": 0,
    "lowCount": 0
};