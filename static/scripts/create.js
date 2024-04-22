const eventSrc = new EventSource('/events/playerlist');
const list = document.querySelector('.player-list');

// if there is an event fill the data in the list
eventSrc.onmessage = async (event) => {
	if (event.data != 'undefined') {
		list.innerHTML = event.data;
	}
}