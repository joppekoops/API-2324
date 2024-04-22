const eventSrc = new EventSource('/events/player');
const buttons = document.querySelectorAll('button');
const main = document.querySelector('main');

eventSrc.onmessage = async (event) => {
	//const data = await (JSON.parse(event.data));

	if (event.data != 'undefined') {

		const eventData = JSON.parse(event.data);

		main.innerHTML = eventData;
	}
	// buttons.forEach((button, i) => {
	// 	button.innerHTML = data.answers[i];
	// 	questionNumberInput.value = data.question;
	// });

}

let countdownSound;
let music;

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