const eventSrc = new EventSource('/events/player');
const buttons = document.querySelectorAll('button');
const main = document.querySelector('main');

// if there is an event fill the data in the main
eventSrc.onmessage = async (event) => {

	if (event.data != 'undefined') {

		const eventData = event.data;

		main.innerHTML = eventData;
	}

}

let countdownSound;
let music;

//Old code for submitting the form without reloading

// for (const form of document.forms) {

// 	form.addEventListener('submit', async (event) => {
// 		event.preventDefault();

// 		let formData = new FormData(form);

// 		for (const entry of formData.entries()) {
// 		  console.log(entry);
// 		}

// 	})
// };


// buttons.forEach(button => {

// 	button.addEventListener('click', async (event) => {
// 		event.preventDefault();

// 		const form = document.querySelector('.answer-buttons');

// 		let formData = new FormData(form);

// 		formData.append(event.target.name, event.target.value);

// 		for (const entry of formData.entries()) {
// 		  console.log(entry);
// 		}

// 	});
// });