'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/* ------------------------------ APPLICATION ------------------------------ */
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnEditWorkout = document.querySelector('.workout-btn__edit');
const btnDeleteAllWorkouts = document.querySelector('.workouts-btn__delete');
const btnShowAllWorkouts = document.querySelector('.workout-btn__zoom');
const btnShowUserPosition = document.querySelector('.workout-btn__me');
const btnSortWorkouts = document.querySelector('.workout-btn__sort');
const btnDeleteWorkout = document.querySelector('.workout-btn__delete');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #currentWorkoutData;
  #currentWorkoutElement;
  #currentWorkoutIndex;
  #currentMarkerIndex;
  #circles = [];
  #userCoords;
  #routes = [];
  #markers = [];
  #bool = false;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Edit current workout
    // btnEditWorkout.addEventListener('click', this._editCurrentWorkout.bind(this));
    
    // Close workout editor
    document.addEventListener('keydown', this._closeEditForm.bind(this));

    // Delete all workouts
    btnDeleteAllWorkouts.addEventListener('click', this._deleteAllWorkouts.bind(this));

    // Show cuurent user position on a map
    btnShowUserPosition.addEventListener('click', this._scrollToUserPostion.bind(this));

    // Sort workouts
    btnSortWorkouts.addEventListener('click', this._setSortedWorkouts.bind(this));

    // Remove current element
    btnDeleteWorkout.addEventListener('click', this._deleteCurrentWorkout.bind(this));

    // Show all workouts on a map 
    btnShowAllWorkouts.addEventListener('click', this._showAllWorkouts.bind(this));

  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#userCoords = coords;

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });

    // Info user 
    const userLocation = L.marker([latitude, longitude]).addTo(this.#map)
    .bindPopup(L.popup({
      maxWidth: 250, 
      minWidth:100,
      autoClose:false,
      closeOnClick:false,
      className:'user-popup'
    }))
    .setPopupContent('You')
    .openPopup();

    userLocation.coords = [latitude, longitude];

    const userCircle = L.circle(userLocation.coords, {
      radius: 200,
      color: '#509825da',
      fillOpacity: 0.2
     });

     userCircle.addTo(this.#map)
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if(!validInputs(cadence, distance, duration)){
        return alert('Check if cadance, distance, duration are numbers!')
      }else if(!allPositive(distance, duration)){
        return alert('Check if distance, duration are positive!')
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if(!validInputs(elevation, distance, duration)){
        return alert('Check if elevation gain, distance, duration are numbers!')
      }else if(!allPositive(distance, duration)){
        return alert('Check if distance, duration are positive!')
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    marker.id = workout.id;

    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    this.#currentWorkoutElement = workoutEl;
    this.#currentWorkoutData = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    this.#currentWorkoutIndex = this.#workouts.findIndex(work => work.id === workoutEl.dataset.id);
    this.#currentMarkerIndex = this.#markers.findIndex(marker => marker.id === workoutEl.dataset.id);

    this._animateCurrentWorkout()

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id 
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // reset() {
  //   localStorage.removeItem('workouts');
  //   location.reload();
  // }


  /*
     Please do not represent as your own resolve ©️Copyright by Max Spizhovyi
  */

  // animate current popup
  _animateCurrentWorkout(){
    document.querySelectorAll('.workout').forEach(work => work.classList.remove('current--workout'));
    this.#currentWorkoutElement.classList.add('current--workout')

    this._animateCircle();
    this._animateLineRoute();
  }

  // Add circle to the current workout on a map
  _animateCircle(){

   const arrIncludes = (arr) => arr.every(circleEl => circleEl.id !== circle.id);

    const circle = L.circle(this.#currentWorkoutData.coords, {
      radius: 120,
      color: 'red',
      fillOpacity:0.2
     });

     circle.id = this.#currentWorkoutData.id;

     if(arrIncludes(this.#circles)){
      this.#circles.push(circle);
     }


    this.#circles.forEach(circle => {
      circle.id === this.#currentWorkoutData.id ? circle.addTo(this.#map) : this.#map.removeLayer(circle)
    });
  }

  // Add route to the current map 
   _animateLineRoute(){

   const checkRoute = arr => arr.every(line => line.id !== route.id);

    const route = L.Routing.control({
        waypoints: [
            L.latLng(this.#userCoords),
            L.latLng(this.#currentWorkoutData.coords)
        ],
        show: false,
        addWaypoints: false,
      });

      route.id = this.#currentWorkoutData.id;
          
      if(checkRoute(this.#routes)){
        this.#routes.push(route);
      }

      
      this.#routes.forEach(line => {
        line.id === this.#currentWorkoutData.id ? line.addTo(this.#map) : line.remove()
      });
   }

  // Close form
  _closeEditForm(e){
     if(e.key === 'Escape'){
      form.classList.add('hidden');
     }
  }
 
  // Delete All Workouts
  _deleteAllWorkouts(){

    /* I decided to remove all elements from the containerWorkouts and also from the map instead just reloading page, 
    and implemented if we even reload the page the array of all workouts will clear and set to the localStorage (-v-') */

    document.querySelectorAll('.workout').forEach(work => containerWorkouts.removeChild(work));

    this._removeAnimation();

    this.#workouts = [];
    this._setLocalStorage();
  }

  _removeAnimation(){
    this.#markers.forEach(marker => this.#map.removeLayer(marker));
    this.#circles.forEach(circle => this.#map.removeLayer(circle));
    this.#routes.forEach(line => line.remove());
    
    this.#circles = [];
    this.#markers = [];
    this.#routes = [];
  }

  // Show all workouts on a map 
   _showAllWorkouts(){
    if(this.#markers.length > 0)
        this.#map.fitBounds(L.featureGroup(this.#markers).getBounds());
  }

   // Go to the cuurent user position
   _scrollToUserPostion(){
    this.#map.setView(this.#userCoords, this.#mapZoomLevel, {animate:true, pan:{duration:1}});
   }

   // Set sorted workouts
   _sortWorkouts(){
    document.querySelectorAll('.workout').forEach(work => containerWorkouts.removeChild(work));  
    
    const sorted = this.#bool ? this.#workouts.slice().sort((a, b) => a.distance  -  b.distance) : this.#workouts;

     sorted.forEach(work => {
      this._renderWorkout(work);
     })
   }

   _setSortedWorkouts(){
     
    // ---We need to remove all circles and route lines from the map
     this.#routes.forEach(line => line.remove());
     this.#circles.forEach(circle => this.#map.removeLayer(circle));
     
    // ---I decided to set the value to undefined to avoid errors with deleting current workout
     this.#currentWorkoutData = undefined;
     this.#currentWorkoutElement = undefined;
     this.#currentWorkoutIndex = undefined;

    // ---Sort workouts
     this._sortWorkouts();
     this.#bool = !this.#bool;
   }

   // Edit current workout
   _editCurrentWorkout(){
      if(!this.#currentWorkoutElement)return;
      console.log('Hello')
   }

   // Delete current workout
   _deleteCurrentWorkout(){
    if(this.#currentWorkoutIndex === undefined)return;

    // ---I removed a current workout from the container instead just reloading the page
    containerWorkouts.removeChild(this.#currentWorkoutElement);

    // ---Also removed current marker, circle and route line from the map
    this.#markers.forEach(marker => marker.id === this.#currentWorkoutData.id ? this.#map.removeLayer(marker) : marker);
    this.#circles.forEach(circle => circle.id === this.#currentWorkoutData.id ? this.#map.removeLayer(circle) : circle);
    this.#routes.forEach(line => line.id === this.#currentWorkoutData.id ? line.remove() : line);


    // ---I decided to remove a current workout from the array and sat that array to a local storage
    this.#workouts.splice(this.#currentWorkoutIndex, 1);
    this.#markers.splice(this.#currentMarkerIndex, 1);
    this._setLocalStorage();
   }  

}

const app = new App();