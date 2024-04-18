import * as THREE from 'three'
import { EarthquakeRecord } from './EarthquakeRecord';
import { EarthquakeMarker } from './EarthquakeMarker';
import { pingpong } from 'three/src/math/MathUtils';
import { QuakeVis } from './QuakeVis';

export class Earth extends THREE.Group
{
    public earthMesh : THREE.Mesh;
    private earthMaterial : THREE.MeshLambertMaterial;
    private debugMaterial : THREE.MeshBasicMaterial;
    private earthCol : number;
    private earthRow : number;
    private alpha : number;
    private morphDirection : number;
    private yRotation : number;
    private axialTilt : number;
    
    public planeVertices : number[];
    public sphereVertices : number[];
    public planeNormals : number[];
    public sphereNormals : number[];

    public viewMap : boolean;
    public rotationSpeed : number;
    public axisRotation : number;

    constructor()
    {
        // Call the superclass constructor
        super();

        this.earthMesh = new THREE.Mesh();
        this.earthMaterial = new THREE.MeshLambertMaterial();
        this.debugMaterial = new THREE.MeshBasicMaterial();
        this.planeVertices = [];
        this.sphereVertices = [];
        this.planeNormals = [];
        this.sphereNormals = [];
        this.earthCol = 80;
        this.earthRow = 80;
        this.alpha = 0;
        this.morphDirection = -1;
        this.viewMap = true;
        this.rotationSpeed = 0.5;
        this.axisRotation = 0;
        this.yRotation = 0;
        this.axialTilt = 0;
    }

    public initialize() : void
    {
        // Initialize texture: you can change to a lower-res texture here if needed
        // Note that this won't display properly until you assign texture coordinates to the mesh
        this.earthMaterial.map = new THREE.TextureLoader().load('./data/earth-2k.png');
        this.earthMaterial.map.minFilter = THREE.LinearFilter;

        // Apply the material with the map texture to the mesh
        this.earthMesh.material = this.earthMaterial;

        // Setup the debug material for wireframe viewing
        this.debugMaterial.wireframe = true;

        // Creates the plane and sphere vertices for the map and globe
        this.createVertices();

        // Create the normals for both plane and sphere vertices
        // MUST be called after creating vertices for this.sphereVertices
        this.createNormals();

        // Next we define indices into the array for the two triangles
        var indices = this.createIndices();

        // Creating the texture coordinates for the map
        var uvs = this.createTextureCoords();

        // Set the vertex positions in the geometry
        // The itemSize is 3 because each item is X, Y, Z
        this.earthMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.planeVertices, 3));
        this.earthMesh.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.planeNormals, 3));
        this.earthMesh.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))

        // Set the triangle indices
        this.earthMesh.geometry.setIndex(indices);

        // Add the mesh to this group
        this.add(this.earthMesh);
    }

    // Morphs between the map and globe meshes based on the value of alpha
    private morphEarth() {
        let blendedVertices : number[] = [];
        let blendedNormals : number[] = [];
        for(let i=0; i < this.planeVertices.length; i++)
        {
            blendedVertices.push(THREE.MathUtils.lerp(
                this.planeVertices[i], this.sphereVertices[i], this.alpha));
            
            blendedNormals.push(THREE.MathUtils.lerp(
                this.planeNormals[i], this.sphereNormals[i], this.alpha));
        }

        this.earthMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(blendedVertices, 3));
        this.earthMesh.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(blendedNormals, 3));
    }

    // TO DO: add animations for mesh morphing
    public update(deltaTime: number) : void
    {

        // Update rotation of globe and set morph direction
        if (this.viewMap)
        {
            // Morph towards map mesh
            this.morphDirection = -1;

            // If mesh is still rotated from axial tilt, rotate mesh back
            if (this.axialTilt < 0) {
                this.axialTilt += 23.4 * Math.PI / 180 * deltaTime;
                let mZ = new THREE.Matrix4().makeRotationZ(this.axialTilt);
                this.setRotationFromMatrix(mZ);
            }

            // Reset globe rotation back to 0
            this.yRotation = 0;
        }
        else if (!this.viewMap) 
        {
            // Morph towards globe mesh
            this.morphDirection = 1;

            // Apply animation of rotation caused by axial tilt
            if (this.axialTilt > -23.4 * Math.PI / 180)
                this.axialTilt -= 23.4 * Math.PI / 180 * deltaTime;

            // Simulate Earth's rotation
            this.yRotation += Math.PI/3 * deltaTime * this.rotationSpeed;

            // Create and multiply rotation matrices
            let m = new THREE.Matrix4();
            let mZ = new THREE.Matrix4().makeRotationZ(this.axialTilt);
            let mX = new THREE.Matrix4().makeRotationX(this.axisRotation);
            let mY = new THREE.Matrix4().makeRotationY(this.yRotation);
            m.multiplyMatrices(mZ, mX);
            m.multiply(mY);

            // Set rotation of globe mesh with the combined matrices
            this.setRotationFromMatrix(m);
        }
        
        // Update and clamp the value of alpha based on the view mode
        this.alpha += 1 * deltaTime * this.morphDirection;
        this.alpha = THREE.MathUtils.clamp(this.alpha, 0, 1);

        // Animate the earth morphing between view modes
        this.morphEarth();
    }

    // Controls earthquake marker position, scale, and lifespan
    public animateEarthquakes(currentTime : number)
    {
        this.children.forEach((quake : THREE.Object3D) => {
            if(quake instanceof EarthquakeMarker)
            { 
                // Morph between the map and globe position with alpha
                let blend = new THREE.Vector3().lerpVectors(quake.planeVector, quake.sphereVector, this.alpha);
                quake.position.copy(blend)

                // Gradually shrinks the earthquake marker
                quake.scale.multiplyScalar(0.99)

                // Removes earthquake markers after their life has expired (1 calendar year)
                if(quake.getPlaybackLife(currentTime) == 1)
                    this.remove(quake);
            }
        });
    } 

    public createEarthquake(record : EarthquakeRecord)
    {
        // Number of milliseconds in 1 year (approx.)
        const duration = 12 * 28 * 24 * 60 * 60;

        // Find the position of the earthquake in both the plane and globe positions
        var planePosition = this.convertLatLongToPlane(record.latitude, record.longitude);
        var spherePosition = this.convertLatLongToSphere(record.latitude, record.longitude);

        // Create the earthquake and place it in the scene
        var earthquake = new EarthquakeMarker(planePosition, spherePosition, record, duration);
        this.add(earthquake);
    }

    // Takes latitude and lognitude in degrees and converts it to an x,y (and z=0) position
    public convertLatLongToPlane(latitude: number, longitude: number) : THREE.Vector3
    {
        let latRad = latitude * Math.PI / 180;
        let longRad = longitude * Math.PI / 180;

        return new THREE.Vector3(longRad, latRad, 0);
    }

    // Takes latitude and longitude in degrees and converts it into 3D coordinates in a sphere
    public convertLatLongToSphere(latitude: number, longitude: number) : THREE.Vector3
    {
        // Convert latitude and longitude from degrees to radians
        let latRad = latitude * Math.PI / 180;
        let longRad = longitude * Math.PI / 180;

        // Convert latitude and longitude to 3D position in sphere
        let xSphere = Math.cos(latRad) * Math.sin(longRad);
        let ySphere = Math.sin(latRad);
        let zSphere = Math.cos(latRad) * Math.cos(longRad);

        return new THREE.Vector3(xSphere, ySphere, zSphere);
    }

    // Toggles whether the earth material is the texture or wireframe
    public toggleDebugMode(debugMode : boolean)
    {
        if(debugMode)
            this.earthMesh.material = this.debugMaterial;
        else
            this.earthMesh.material = this.earthMaterial;
    }

    // Create a rectangle and sphere with specified number of vertices
    private createVertices() : void
    {
        // The distance between each of the n columns and m rows
        let colPi = 2*Math.PI/this.earthCol;
        let rowPi = -Math.PI/this.earthRow;

        for (var i=0; i<(this.earthRow+1); i++) {
            for (var j=0; j<(this.earthCol+1); j++) {
                // Find longitude and latitide of current plane vertex i,j pair
                let latitude = i*rowPi+(Math.PI/2);
                let longitude = j*colPi-Math.PI;

                // Push corresponding i,j pair plane vertex
                this.planeVertices.push(longitude, latitude, 0);

                // Create matching sphere vertex for current longitude and latitude (in degrees)
                let sVect = this.convertLatLongToSphere(latitude*180/Math.PI, longitude*180/Math.PI);
                this.sphereVertices.push(sVect.x, sVect.y, sVect.z);
            }
        }
    }

    // Creates normals for each vertex in plane and sphere form
    private createNormals () : void
    {
        for (var i=0; i<(this.earthCol+1)*(this.earthRow+1); i++)
        {
            // For plane, normals will always point towards the screen
            this.planeNormals.push(0,0,1);

            // Push positions of the current sphere vertex to the array
            // This works because the position is already normalized
            this.sphereNormals.push(this.sphereVertices[3*i], this.sphereVertices[3*i+1], this.sphereVertices[3*i+2]);
        }
    }

    // Create and returns the indices of the individual triangles that make up the mesh
    private createIndices() : number[]
    {
        let indices : number[] = [];

        // Creates indices in general pattern for both plane and sphere 
        for (var i=0; i<this.earthRow; i++) {
            for (var j=0; j<this.earthCol; j++) {
                indices.push(j+i*(this.earthCol+1), j+i*(this.earthCol+1)+(this.earthCol+1), j+i*(this.earthCol+1)+(this.earthCol+2));
                indices.push(j+i*(this.earthCol+1)+(this.earthCol+2), j+i*(this.earthCol+1)+1, j+i*(this.earthCol+1));
            }
        }

        return indices;
    }

    // Creates and returns the uvs to create the texture map
    private createTextureCoords() : number[] 
    {
        let uvs : number[] = [];

        // Rescales image and maps texture to vertices
        for (let i=0; i<(this.earthRow+1); i++) {
            for (let j=0; j<(this.earthCol+1); j++) {    
                uvs.push(this.rescale(j*2048/this.earthCol, 0, 2048, 0, 1), this.rescale(i*1024/this.earthRow, 0, 1024, 1, 0));
            }
        }

        return uvs;
    }

    // Rescales a number between maximum and minimum x values to a number between maximum and minimum y values
    private rescale(x: number, xmin: number, xmax: number, ymin:number, ymax: number) : number
    {
        return ymin + (ymax - ymin) * (x - xmin) / (xmax - xmin);
    }
}