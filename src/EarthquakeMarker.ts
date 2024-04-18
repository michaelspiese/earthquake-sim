import * as THREE from 'three'
import { EarthquakeRecord } from './EarthquakeRecord';

export class EarthquakeMarker extends THREE.Mesh
{
    public startTime : number;
    public duration : number;
    public magnitude : number;
    public planeVector : THREE.Vector3;
    public sphereVector : THREE.Vector3;

    private highColor : THREE.Color;
    private lowColor : THREE.Color;

    constructor(planePosition : THREE.Vector3, spherePosition : THREE.Vector3, record: EarthquakeRecord, duration : number)
    {
        super();

        this.startTime = record.date.getTime();
        this.magnitude = record.normalizedMagnitude;
        this.duration = duration;
        this.planeVector = planePosition;
        this.sphereVector = spherePosition;
        this.position.copy(planePosition);

        this.highColor = new THREE.Color(1,0,0);
        this.lowColor = new THREE.Color(0,1,0);

        // Create the sphere geometry
        // Global adjustment of 0.05 to reduce the size
        // You should probably update this be a more meaningful representation of the data
        this.geometry = new THREE.SphereGeometry(0.05);
        this.scale.multiplyScalar(this.magnitude * 2);

        // Initially, the color is set to yellow
        // You should update this to be more a meaningful representation of the data
        var material = new THREE.MeshLambertMaterial();
        material.color = new THREE.Color().lerpColors(this.lowColor, this.highColor, this.magnitude);
        this.material = material;
    }

    // This returns a number between 0 (start) and 1 (end)
    getPlaybackLife(currentTime : number) : number
    {
        return THREE.MathUtils.clamp(Math.abs(currentTime/1000 - this.startTime/1000) / this.duration, 0, 1);
    }
}