const eventSrc = new EventSource('/events/master');
const main = document.querySelector('main');

// if there is an event fill the data in the main
eventSrc.onmessage = async (event) => {
	if (event.data != 'undefined') {
		main.innerHTML = event.data;
	}

}

// define the sounds (only for master)

const countdownSound = new Audio('../sounds/countdown.mp3');

const music = new Audio('../sounds/music.mp3');