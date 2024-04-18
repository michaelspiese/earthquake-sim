import * as THREE from 'three'
import { GUI } from 'dat.gui'
import { GraphicsApp } from './GraphicsApp'
import { Earth } from './Earth';
import { EarthquakeDatabase } from './EarthquakeDatabase';
import { Audio } from 'three';

export class QuakeVis extends GraphicsApp
{
    private earth : Earth;
    private gui : GUI;
    private earthquakeDB : EarthquakeDatabase;

    // State variables
    private currentTime : number;
    private mouseDrag : boolean;
    private mouseVector : THREE.Vector2;

    // GUI variables
    private date : string;
    private viewMode : string;
    private playbackSpeed : number;
    private rotationSpeed : number;
    private axisRotation : number;
    private musicToggle : boolean;
    private debugMode : boolean;

    // Container to hold song
    private sound! : Audio;

    constructor()
    {
        // Pass in the default camera parameters to the superclass constructor
        super(60, 1920/1080, 0.1, 50);

        this.gui = new GUI();
        this.earth = new Earth();
        this.earthquakeDB = new EarthquakeDatabase('./data/earthquakes.txt');

        this.currentTime = Infinity;
        this.mouseDrag = false;
        this.mouseVector = new THREE.Vector2();

        this.date = '';
        this.viewMode = 'Map';
        this.playbackSpeed = 0.5;
        this.rotationSpeed = 0.5;
        this.axisRotation = 0;
        this.musicToggle = false;
        this.debugMode = false;
    }

    createScene() : void
    {
        // Setup camera
        this.camera.position.set(0, 0, 3.25);
        this.camera.lookAt(0, 0, 0);
        this.camera.up.set(0, 1, 0);

        // Create a directional light
        var directionalLight = new THREE.DirectionalLight('white', 1.5);
        directionalLight.position.set(10, 10, 15);
        this.scene.add(directionalLight)

        // Create an audio listener and add it to the camera
        const audio = new THREE.Audio(new THREE.AudioListener());

        // Load the audio and configure volume and looping
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('earfquake.mp3', function(buffer) {
	        audio.setBuffer(buffer);
	        audio.setLoop(true);
	        audio.setVolume(0.25);
        });

        // Set global audio container to the loaded song
        this.sound = audio;

        // Load a texture and set it as the background
        this.scene.background = new THREE.TextureLoader().load('./data/stars.png')

        // Initialize the earth and add it to the scene
        this.earth.initialize();
        this.scene.add(this.earth);

        // Create a new GUI folder to hold earthquake controls
        var controls = this.gui.addFolder('Earthquake Controls');

        // Create a GUI control to show the current date and make it listen for changes
        var dateController = controls.add(this, 'date');
        dateController.name('Current Date');
        dateController.listen();

        // Create a GUI control for the view mode and add a change event handler
        var viewController = controls.add(this, 'viewMode', {Map: 'Map', Globe: 'Globe'});
        viewController.name('View Mode');
        viewController.onChange((value: string) => { 
            // TO DO: switch between map and globe views
            if (value == 'Map') 
            {
                console.log("Map")
                this.earth.viewMap = true;
            }
            else if (value == 'Globe')
            {
                console.log("Globe")
                this.earth.viewMap = false;
            }

        });
        
        // Create a GUI control for the playback speed and add a change event handler
        var playbackController = controls.add(this, 'playbackSpeed', 0, 1);
        playbackController.name('Playback Speed');

        // Create a GUI control for the earth rotation speed and add a change event handler
        var rotationSpeedController = controls.add(this, 'rotationSpeed', 0, 1);
        rotationSpeedController.name('Rotation Speed');

        // Create a GUI control for the earth rotation speed and add a change event handler
        var rotationController = controls.add(this, 'axisRotation', -Math.PI/2, Math.PI/2);
        rotationController.name('X-Axis Rotation');

        // Create a GUI control for the debug mode and add a change event handler
        var musicController = controls.add(this, 'musicToggle');
        musicController.name('Music Toggle');
        musicController.onChange((value: boolean) => { this.toggleMusic(value) });

        // Create a GUI control for the debug mode and add a change event handler
        var debugController = controls.add(this, 'debugMode');
        debugController.name('Debug Mode');
        debugController.onChange((value: boolean) => { this.toggleDebugMode(value) });

        // Make the GUI controls wider and open by default
        this.gui.width = 300;
        controls.open();
    }

    update(deltaTime : number) : void
    {
        // The data file is large and read asynchronously
        // If we try to read the earthquake data right away, we will encounter an exception
        // This will terminate the update loop if it has not been loaded yet
        if(!this.earthquakeDB.loaded)
            return;

        this.earth.rotationSpeed = this.rotationSpeed;

        this.earth.axisRotation = this.axisRotation;

        // Scale factor for time progression
        const playbackScale = 30000000000;

        // Advance current time in milliseconds
        this.currentTime += playbackScale * this.playbackSpeed * deltaTime;

        // If we are beyond the max time, loop back to the beginning
        if(this.currentTime > this.earthquakeDB.getMaxTime())
        {
            this.currentTime = this.earthquakeDB.getMinTime();
            this.earthquakeDB.reset();
        }

        // Update the current date
        var currentDate = new Date();
        currentDate.setTime(this.currentTime);
        this.date = currentDate.getUTCMonth() + "/" + currentDate.getUTCDate() + "/" + currentDate.getUTCFullYear();

        // Create the earthquakes!
        var quake = this.earthquakeDB.getNextQuake(currentDate);
        while(quake)
        {
            // Create an earthquake
            this.earth.createEarthquake(quake);

            // Advance to the next earthquake in the list
            quake = this.earthquakeDB.getNextQuake(currentDate);
        }

        // Call the earth's update method
        this.earth.update(deltaTime);

        // Animate the earthquake markers (and remove ones that are too old)
        this.earth.animateEarthquakes(this.currentTime);
    }

    toggleDebugMode(value: boolean) : void
    {
        this.earth.toggleDebugMode(value);
    }

    toggleMusic(value : boolean) : void{
        if (value) 
        {
            this.sound.play();
        }
        else 
        {
            this.sound.pause();
        }
    }

    // Mouse event handlers for wizard functionality
    onMouseDown(event: MouseEvent) : void 
    {
        this.mouseDrag = true;
    }

    // Mouse event handlers for wizard functionality
    onMouseUp(event: MouseEvent) : void
    {
        this.mouseDrag = false;
    }

    // Mouse event handlers for wizard functionality
    onMouseMove(event: MouseEvent) : void
    {
        if(this.mouseDrag)
        {
            // You can add code here to make something happen when the user
            // clicks and drags the mouse
        }

        // Set the mouse vector in case we need to use it in update()
        this.mouseVector.set(event.x, event.y);
    }
}