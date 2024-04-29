class RouteManager {
    constructor() {
        this.setDefaults();
    }

    setDefaults() {
        this.destination = "Unset";
        this.lineNumber = "---";
        this.primaryColor = "#157733"; // default green color
        this.textColorOnPrimary = "white"; // default text color (for next stop)
        this.route = [];
        this.startTimestamp = null; // route stop times will be relative to this milliseconds timestamp
        this.updateUI();
    }

    updateStopTimestamps() {
        if (this.startTimestamp != null) {
            this.route.forEach(stop => {
                stop.timestamp = this.startTimestamp + (stop.time * 60 * 1000);
            });
        }
        this.renderStops();
    }

    parseFromText(text) {
        console.log(text);
        const lines = text.split("\n");
        let destination = "";
        let lineNumber = "";
        let primaryColor = "";
        let textColorOnPrimary = "";
        let stopTime = "";
        let stopName = "";
        let route = [];
        let phase = 0;
        // phases of reading text file:
        // 0 - line number
        // 1 - destination
        // 2 - primaryColor; textColorOnPrimary   [COLORS]
        // 3 - timeFromRouteStart; stopName    [ROUTE STOPS] until end of file

        for (let line of lines) {
            line = line.trim();
            if (line.length == 0) continue;
            if (line[0] == "/") continue;

            switch (phase) {
                case 0:
                    lineNumber = line;
                    break;

                case 1:
                    destination = line;
                    break;

                case 2:
                    [primaryColor, textColorOnPrimary] = line.split(" ").map(x => x.trim());
                    break;

                case 3:
                    [stopTime, stopName] = line.split(";").map(x => x.trim());
                    stopTime = Number(stopTime);
                    route.push(new RouteStop(stopTime, stopName));
                    break;
            }

            if (phase < 3) phase++;
        }

        // Validate if the values are set correctly
        if (lineNumber == "") alert("Line number not set.");
        else if (lineNumber.length > 15) alert("Line number too long.");
        else if (destination == "") alert("Destination name not set.");
        else if (destination.length > 50) alert("Destination too long");
        else if (primaryColor == "") alert("Primary color not set.");
        else if (textColorOnPrimary == "") alert("Primary color not set.");
        else if (route.length < 2) alert(`Route must have at least 2 stops. Has: ${route.length}`);
        else if (route.some(b => b.name == undefined || isNaN(b.time))) alert("Error reading route stops.");
        else {
            this.destination = destination;
            this.lineNumber = lineNumber;
            this.primaryColor = primaryColor;
            this.textColorOnPrimary = textColorOnPrimary;
            this.route = route;
            this.startTimestamp = null;
            console.log(this);
            this.updateUI(true);
        }
    }

    renderStops() {
        if (this.route.length > 1) {
            // prepare new stop list
            let newStops = [];
            this.route.forEach(stop => {
                const templateClone = stopTemplate.content.cloneNode(true);
                const cloneStopName = templateClone.querySelector(".stop_name");
                const cloneStopTime = templateClone.querySelector(".stop_time");
                const cloneStopNumber = templateClone.querySelector(".stop_indicator");

                cloneStopName.textContent = stop.name;
                cloneStopNumber.textContent = newStops.length + 1;
                if (stop.timestamp != null) cloneStopTime.textContent = formatTimestamp(stop.timestamp);

                newStops.push(templateClone);
            });

            // add current and final stop classes
            newStops[0].firstElementChild.classList.add("current_stop");
            newStops[newStops.length - 1].firstElementChild.classList.add("final_stop");

            // clear stop list
            while (stopList.firstChild) stopList.removeChild(stopList.lastChild);

            // render new stops
            newStops.forEach(newStop => stopList.appendChild(newStop));
        }

        function formatTimestamp(ts) {
            const date = new Date(ts);
            const hours = date.getHours().toString();
            let minutes = date.getMinutes().toString();

            if (minutes < 10) minutes = "0" + minutes;

            return (hours + ":" + minutes);
        }
    }

    updateUI(redrawStops = false) {
        destName.textContent = this.destination;
        destNumber.textContent = this.lineNumber;
        // set css variables
        document.documentElement.style.setProperty("--primary", this.primaryColor);
        document.documentElement.style.setProperty("--on-primary", this.textColorOnPrimary);

        // animated borders on buttons (recommended actions)
        if (this.lineNumber == "---") {
            // route has not been loaded
            startRouteBtn.classList.add("disabled");
            nextStopButton.classList.add("disabled");
        }
        else {
            // route has been loaded
            startRouteBtn.classList.remove("disabled");
            loadRouteBtn.classList.remove("recommended_action");

            if (this.startTimestamp == null) {
                // route loaded, but not started
                startRouteBtn.classList.add("recommended_action");
                nextStopButton.classList.add("disabled");
            } else {
                // route loaded and started
                nextStopButton.classList.remove("disabled");
                startRouteBtn.classList.remove("recommended_action");
            }
        }

        if (redrawStops) this.renderStops();
    }
}

class RouteStop {
    constructor(time, name) {
        this.name = name;
        this.time = time;
        this.timestamp = null;
    }
}

const destName = document.querySelector("#destination_name");
const destNumber = document.querySelector("#destination_number");

const stopList = document.querySelector("#stop_list");

const loadRouteBtn = document.querySelector("#load_route");
const startRouteBtn = document.querySelector("#start_route_button");

const startRouteDialog = document.querySelector("#start_route_dialog");
const startRouteDialogOK = document.querySelector("#accept_start_route_dialog");
const useCurrentTimeBtn = document.querySelector("#use_current_time_button");
const hourInput = document.querySelector("#hour_input");
const minuteInput = document.querySelector("#minute_input");
const timePickerError = document.querySelector("#time_picker_error");

const nextStopButton = document.querySelector("#next_stop_button");
const settingsButton = document.querySelector("#settings_button");
const fileInput = document.querySelector("#load_route_input");

const stopTemplate = document.querySelector("#stop_template");


// RouteManager instance
const routeManager = new RouteManager();


// dialog (pop-up) related functions
function showDialog(dialog) {
    dialog.classList.remove("hidden");
    const focusFirst = dialog.querySelector(".focus_first");
    if (focusFirst != null) focusFirst.focus();

}
function hideDialog(dialog) { dialog.classList.add("hidden"); }


startRouteBtn.addEventListener("click", () => {
    showDialog(startRouteDialog); setCurrentStartTime();
});
startRouteDialogOK.addEventListener("click", handleStartRouteDialog);
useCurrentTimeBtn.addEventListener("click", setCurrentStartTime);


function handleStartRouteDialog() {
    // reset error display
    timePickerError.textContent = "";

    const hour = parseInt(hourInput.value);
    const minute = parseInt(minuteInput.value);

    // validate inputs
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 24 || minute < 0 || minute > 59) {
        timePickerError.textContent = "Set a valid time between 00:00 and 23:59";
        return;
    } else {
        const startDate = new Date();
        startDate.setHours(hour);
        startDate.setMinutes(minute);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);

        // set the route start timestamp and hide dialog
        routeManager.startTimestamp = startDate.getTime();
        routeManager.updateStopTimestamps();
        routeManager.updateUI();
        hideDialog(startRouteDialog);
    }
}

function setCurrentStartTime() {
    const now = new Date();
    hourInput.value = now.getHours();
    minuteInput.value = leadingZero(now.getMinutes());

    function leadingZero(string) {
        string = string.toString();
        if (string.length < 2) return "0" + string;
        else return string;
    }
}



// handling file input

fileInput.addEventListener("change", handleFile);

function handleFile() {
    const files = this.files;
    if (files.length === 1) {
        const file = files[0];
        const reader = new FileReader();

        reader.addEventListener("load", (e) => {
            routeManager.parseFromText(e.target.result);
        });

        reader.readAsText(file);
    }
}