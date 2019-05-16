
// Useful Variables
let _width = window.innerWidth;
let _height = window.innerHeight;
const simplexNoise = new SimplexNoise();

function main() {
    let input = document.querySelector("input[type=file]");
    let audio = document.querySelector("audio");
    input.onchange = (() => {
        audio.src = URL.createObjectURL(input.files[0]);
        audio.load();
        audio.play();
        init();
    })

    function init() {
        // Set up for audio analyzer
        const ctx = new AudioContext();
        const src = ctx.createMediaElementSource(audio);
        const analyzer = ctx.createAnalyser();
        src.connect(analyzer);
        analyzer.connect(ctx.destination);
        analyzer.fftSize = 1024;
        const bufferLength = analyzer.frequencyBinCount;
        const freq_data = new Uint8Array(bufferLength);

        // Set up for building 3.js scene
        const scene = new THREE.Scene();
        const group = new THREE.Group();
        const camera = new THREE.PerspectiveCamera(125, _width / _height, 0.1, 1250)
        camera.position.set(0, 50, 40);
        camera.lookAt(scene.position);
        scene.add(camera);

        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(_width, _height);
        document.getElementById('out').appendChild(renderer.domElement);

        // ~~~~~~~~~~~~~~~~~~~~ Object Creation ~~~~~~~~~~~~~~~~~~~~

        // Create center sphere
        let sphere_geo = new THREE.IcosahedronGeometry(4, 3);
        let sphere_mat = new THREE.MeshNormalMaterial({
            wireframe: true
        });

        const sphere = new THREE.Mesh(sphere_geo, sphere_mat);
        sphere.position.set(0, 0, 0);
        group.add(sphere);

        // Create top & bottom planes
        let plane_geo = new THREE.PlaneGeometry(1000, 1000, 15, 15);
        let plane_mat = new THREE.MeshLambertMaterial({
            color: 0x4265f4,
            side: THREE.DoubleSide,
            wireframe: true
        });

        const tplane = new THREE.Mesh(plane_geo, plane_mat);
        tplane.rotation.x = -0.50 * Math.PI;
        tplane.position.set(90, 30, 0);

        group.add(tplane);

        // Set up Ambient Lighting
        const ambientLight = new THREE.AmbientLight(0xaaaaaa);
        scene.add(ambientLight);

        // Set up spotlight
        const spotLight = new THREE.SpotLight(0xffffff);
        spotLight.intensity = 0.9;
        spotLight.position.set(-10, 40, 20);
        spotLight.lookAt(sphere);
        spotLight.castShadow = true;
        scene.add(spotLight);

        // ~~~~~~~~~~~~~~~~~~~~ Orbit controls ~~~~~~~~~~~~~~~~~~~~
        let controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.autoRotate = true;
        controls.update();

        scene.add(group);

        // ~~~~~~~~~~~~~~~~~~~~ Animate audio visualization ~~~~~~~~~~~~~~~~~~~~

        render();

        function render() {
            analyzer.getByteFrequencyData(freq_data);

            const bassFr = freq_data.slice(0, (freq_data.length / 2));
            const trebFr = freq_data.slice(freq_data.length / 2, freq_data.length - 1)

            let bassMax = max(bassFr);
            let trebAvg = avg(trebFr);
            let totalAvg = avg(freq_data);

            vibrateSphere(sphere, bassMax * 0.15, trebAvg * 0.15);
            vibratePlane(tplane, totalAvg * 0.3);

            sphere.rotation.x += 0.005;
            group.rotation.y += 0.005;
            renderer.render(scene, camera);
            requestAnimationFrame(render);


        }

        function vibrateSphere(obj, bassFr, trebFr) {
            obj.geometry.vertices.forEach((vertex, i) => {
                let offset = obj.geometry.parameters.radius;
                let time = window.performance.now();
                vertex.normalize();
                let rfreq = 0.00001
                let dist = (offset + bassFr) + simplexNoise.noise3D(
                    vertex.x + time * rfreq * 6,
                    vertex.y + time * rfreq * 7,
                    vertex.z + time * rfreq * 8) * trebFr;
                vertex.multiplyScalar(dist);
            });
            obj.geometry.verticesNeedUpdate = true;
            obj.geometry.normalsNeedUpdate = true;
            obj.geometry.computeVertexNormals();
            obj.geometry.computeFaceNormals();
        }

        function vibratePlane(obj, avgFr) {
            obj.geometry.vertices.forEach((vertex, i) => {
              let time = Date.now();
              let dist = simplexNoise.noise2D(
                vertex.x + time * 0.0008,
                vertex.y + time * 0.0008) * avgFr;
                vertex.z = dist;
            });
            obj.geometry.verticesNeedUpdate = true;
            obj.geometry.normalsNeedUpdate = true;
            obj.geometry.computeVertexNormals();
            obj.geometry.computeFaceNormals();
        }

        audio.play();
    }
}
window.onload = main();

// Helper functions
function max(arr) {
    return arr.reduce((a, b) => {
        return Math.max(a, b);
    })
}

function avg(arr) {
    let avg = arr.reduce((acc, a) => { return acc + a; });
    return (avg / arr.length);
}

