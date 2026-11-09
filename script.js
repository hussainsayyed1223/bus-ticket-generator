// ==================================
// BUS TICKET DEMO APPLICATION
// ==================================

const ticketColors = [
    "#F5E8E8",
    "#E5EFF7",
    "#E8F1E7",
    "#FFF2D9"
];

const HISTORY_KEY = "demoTickets";
const CURRENT_TICKET_KEY = "demoTicket";

// Read ticket history safely.
function getTicketHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

// Save the full ticket history.
function saveTicketHistory(tickets) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(tickets));
}

// Keep the currently selected ticket for ticket.html.
function setCurrentTicket(ticket) {
    localStorage.setItem(CURRENT_TICKET_KEY, JSON.stringify(ticket));
}

// Format: 08 Nov, 26 | 00:20 AM
function formatTicketDateTime(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-GB", { month: "short" });
    const year = String(date.getFullYear()).slice(-2);
    const time = date.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

    return `${day} ${month}, ${year} | ${time}`;
}

// ID format: YYMMDD + 6 random digits + 3 letters + 1 digit.
function generateUniqueTicketId(existingIds = []) {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let ticketId;
    do {
        let sixDigits = "";
        for (let i = 0; i < 6; i++) {
            sixDigits += Math.floor(Math.random() * 10);
        }

        let threeLetters = "";
        for (let i = 0; i < 3; i++) {
            threeLetters += letters[Math.floor(Math.random() * letters.length)];
        }

        const finalDigit = Math.floor(Math.random() * 10);
        ticketId = `${year}${month}${day}${sixDigits}${threeLetters}${finalDigit}`;
    } while (existingIds.includes(ticketId));

    return ticketId;
}

// Split route into two lines: first two words, then all remaining words.
// The second line is centered under the first line within that route's own block.
function renderJourneyStop(element, routeName) {
    const words = String(routeName || "").trim().split(/\s+/).filter(Boolean);
    const firstLine = words.slice(0, 2).join(" ");
    const secondLine = words.slice(2).join(" ");

    element.replaceChildren();

    const first = document.createElement("span");
    first.className = "journey-first-line";
    first.textContent = firstLine;
    element.appendChild(first);

    if (secondLine) {
        const second = document.createElement("span");
        second.className = "journey-second-line";
        second.textContent = secondLine;
        element.appendChild(second);
    }
}

// ==================================
// GENERATE TICKET FROM THE FORM
// ==================================

const ticketForm = document.getElementById("ticketForm");

if (ticketForm) {
    ticketForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const routeNumber = document.getElementById("routeNumber").value.trim();
        const startRoute = document.getElementById("startRoute").value.trim();
        const endRoute = document.getElementById("endRoute").value.trim();
        const fare = Number(document.getElementById("fare").value);

        if (!routeNumber || !startRoute || !endRoute ||
            !Number.isFinite(fare) || fare <= 0) {
            alert("Please enter valid demo ticket details.");
            return;
        }

        const bookingTime = Date.now();
        const expiryTime = bookingTime + (30 * 60 * 1000);

        const history = getTicketHistory();
        const existingIds = history.map(ticket => ticket.ticketId);
        const ticketId = generateUniqueTicketId(existingIds);

        let colorIndex = Number(localStorage.getItem("colorIndex") || 0);
        if (!Number.isInteger(colorIndex) || colorIndex < 0 ||
            colorIndex >= ticketColors.length) {
            colorIndex = 0;
        }

        const selectedColor = ticketColors[colorIndex];
        colorIndex = (colorIndex + 1) % ticketColors.length;
        localStorage.setItem("colorIndex", String(colorIndex));

        const ticketData = {
            routeNumber,
            startRoute,
            endRoute,
            fare,
            bookingTime,
            expiryTime,
            ticketId,
            selectedColor
        };

        // Add the new ticket without deleting earlier tickets.
        history.unshift(ticketData);
        saveTicketHistory(history);
        setCurrentTicket(ticketData);

        window.location.href = "ticket.html";
    });
}

// ==================================
// DISPLAY SELECTED TICKET
// ==================================

const ticketCard = document.getElementById("ticketCard");

if (ticketCard) {
    let ticketData = null;

    try {
        ticketData = JSON.parse(localStorage.getItem(CURRENT_TICKET_KEY) || "null");
    } catch (error) {
        ticketData = null;
    }

    if (!ticketData) {
        const history = getTicketHistory();
        ticketData = history[0] || null;
    }

    if (!ticketData) {
        alert("No demo ticket found. Please enter the details first.");
        window.location.href = "index.html";
    } else {
        document.getElementById("routeNumber").textContent = ticketData.routeNumber;
        document.getElementById("fare").textContent = "₹" + Number(ticketData.fare).toFixed(0);

        renderJourneyStop(document.getElementById("startRoute"), ticketData.startRoute);
        renderJourneyStop(document.getElementById("endRoute"), ticketData.endRoute);

        document.getElementById("bookingTime").textContent =
            formatTicketDateTime(ticketData.bookingTime);

        document.getElementById("validTime").textContent =
            formatTicketDateTime(ticketData.expiryTime);

        document.getElementById("ticketId").textContent = ticketData.ticketId;

        ticketCard.style.backgroundColor = ticketData.selectedColor || ticketColors[0];

        // Logo animation: same animation name and timing as the original code.
        const logo = document.getElementById("demoLogo");
        if (logo) {
            logo.style.animation = "logoPulse 2s infinite";
        }

        const countdownElement = document.getElementById("countdown");
        const expiryText = document.getElementById("expiryText");
        let countdownInterval;

        function updateCountdown() {
            const remaining = Number(ticketData.expiryTime) - Date.now();

            if (remaining <= 0) {
                countdownElement.textContent = "00:00:00";
                expiryText.textContent = "EXPIRED";
                expiryText.classList.add("expired");
                clearInterval(countdownInterval);
                updateHistoryStatus(ticketData.ticketId);
                return;
            }

            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            const formatted =
                String(hours).padStart(2, "0") + ":" +
                String(minutes).padStart(2, "0") + ":" +
                String(seconds).padStart(2, "0");

            countdownElement.textContent = formatted;
            expiryText.classList.remove("expired");
            expiryText.firstChild.textContent = "Expires In ";
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
    }
}

// Update history's stored status based on the original expiry timestamp.
function updateHistoryStatus(ticketId) {
    const history = getTicketHistory();
    const updated = history.map(ticket => {
        if (ticket.ticketId === ticketId) {
            return {
                ...ticket,
                status: Date.now() >= Number(ticket.expiryTime) ? "EXPIRED" : "ACTIVE"
            };
        }
        return ticket;
    });
    saveTicketHistory(updated);
}

// ==================================
// TICKET HISTORY PAGE
// ==================================

const historyList = document.getElementById("ticketHistoryList");

if (historyList) {
    const history = getTicketHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-history">No tickets have been generated yet.</p>';
    } else {
        historyList.replaceChildren();

        history.forEach(ticket => {
            const isExpired = Date.now() >= Number(ticket.expiryTime);
            const status = isExpired ? "EXPIRED" : "ACTIVE";

            const card = document.createElement("article");
            card.className = "history-ticket";
            card.style.borderLeftColor = ticket.selectedColor || ticketColors[0];

            const heading = document.createElement("div");
            heading.className = "history-ticket-heading";

            const route = document.createElement("strong");
            route.textContent = `Route ${ticket.routeNumber}`;

            const badge = document.createElement("span");
            badge.className = `status-badge ${isExpired ? "status-expired" : "status-active"}`;
            badge.textContent = status;

            heading.append(route, badge);

            const journey = document.createElement("p");
            journey.className = "history-journey";
            journey.textContent = `${ticket.startRoute}  →  ${ticket.endRoute}`;

            const id = document.createElement("p");
            id.className = "history-id";
            id.textContent = `Ticket ID: ${ticket.ticketId}`;

            const time = document.createElement("p");
            time.className = "history-time";
            time.textContent = `Booked: ${formatTicketDateTime(ticket.bookingTime)}`;

            const fare = document.createElement("p");
            fare.className = "history-fare";
            fare.textContent = `Fare: ₹${Number(ticket.fare).toFixed(2)}`;

            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "history-view-button";
            viewButton.textContent = "View Ticket";
            viewButton.addEventListener("click", () => {
                setCurrentTicket(ticket);
                window.location.href = "ticket.html";
            });

            card.append(heading, journey, id, time, fare, viewButton);
            historyList.appendChild(card);
        });
    }
}
