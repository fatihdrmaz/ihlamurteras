import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

// Three.js temel bileşenleri
let scene, camera, renderer, controls;
let raycaster, mouse;
let interactiveObjects = [];

// Popup elementi
const popup = document.getElementById('popup');
const popupTitle = document.getElementById('popup-title');
const popupDescription = document.getElementById('popup-description');
const closeButton = document.querySelector('.close-button');

// Otel noktaları ve bilgileri
const hotelPoints = [
    {
        position: { x: 0, y: 0, z: 0 },
        title: "Resepsiyon",
        description: "Otelimizin ana giriş noktası. 7/24 hizmet veren resepsiyon ekibimiz size yardımcı olmaktan mutluluk duyacaktır."
    },
    {
        position: { x: 5, y: 0, z: 5 },
        title: "Standart Oda",
        description: "Modern ve konforlu standart odalarımız 30m² büyüklüğünde olup, şehir manzarasına sahiptir."
    },
    {
        position: { x: -5, y: 0, z: 5 },
        title: "Suit Oda",
        description: "Lüks suit odalarımız 50m² büyüklüğünde olup, özel jakuzi ve oturma alanına sahiptir."
    }
];

// Direksiyon noktası
const steeringWheelPoint = {
    position: { x: 0, y: 0, z: 0 },
    title: "Direksiyon",
    description: "Araç kontrolü için kullanılan direksiyon simidi."
};

const MAIN_PANORAMA = 'GS__0369.JPG'; // Ana görselin dosya adı

// Side panel oluştur (eğer yoksa)
function ensureSidePanel() {
    let panel = document.getElementById('side-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'side-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '20px';
        panel.style.right = '20px';
        panel.style.width = '320px';
        panel.style.background = 'rgba(255,255,255,0.97)';
        panel.style.borderRadius = '16px';
        panel.style.boxShadow = '0 2px 16px rgba(0,0,0,0.15)';
        panel.style.padding = '20px';
        panel.style.zIndex = '2000';
        panel.style.display = 'none';
        panel.style.flexDirection = 'column';
        panel.style.gap = '12px';
        panel.style.maxHeight = '60vh';
        panel.style.overflowY = 'auto';
        document.body.appendChild(panel);
    }
    return panel;
}

function showSidePanel(imgSrc, title, description) {
    const panel = ensureSidePanel();
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;">${title}</h3>
            <button id="close-side-panel" style="background:none;border:none;font-size:22px;cursor:pointer;">&times;</button>
        </div>
        <img src="${imgSrc}" alt="${title}" style="width:100%;border-radius:10px;object-fit:cover;max-height:160px;margin:10px 0;" />
        <div style="font-size:15px;color:#333;">${description}</div>
    `;
    panel.style.display = 'flex';
    document.getElementById('close-side-panel').onclick = () => {
        panel.style.display = 'none';
    };
}

function hideSidePanel() {
    const panel = document.getElementById('side-panel');
    if (panel) panel.style.display = 'none';
}

function ensureBackButton() {
    let btn = document.getElementById('back-to-main');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'back-to-main';
        btn.textContent = 'Ana Görsele Dön';
        btn.style.position = 'fixed';
        btn.style.top = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '3000';
        btn.style.padding = '10px 18px';
        btn.style.background = '#c44';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.fontSize = '16px';
        btn.style.cursor = 'pointer';
        btn.style.display = 'none';
        document.body.appendChild(btn);
    }
    return btn;
}

// Sahneyi başlat
function init() {
    try {
        console.log('Sahne başlatılıyor...');
        
        // Sahne oluştur
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Açık mavi arka plan

        // Kamera oluştur
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 0.1);

        // Renderer oluştur
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('scene-container').appendChild(renderer.domElement);

        // Kontroller ekle
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = false;
        controls.rotateSpeed = -0.5;

        // Işıklandırma
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // 360 panorama için küre oluştur
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1);

        // Texture loader oluştur
        const textureLoader = new THREE.TextureLoader();
        
        // 360 panorama görüntüsünü yükle
        textureLoader.load(
            MAIN_PANORAMA,
            function(texture) {
                console.log('Texture yüklendi');
                const material = new THREE.MeshBasicMaterial({
                    map: texture
                });
                const sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
                console.log('360 panorama eklendi');

                // Marker'ı ekle (daha görünür bir pozisyona yerleştir)
                addCustomMarker(new THREE.Vector3(0, 0, -100));
            },
            undefined,
            function(error) {
                console.error('360 panorama yüklenirken hata oluştu:', error);
                // Hata durumunda basit bir küre göster
                const material = new THREE.MeshBasicMaterial({
                    color: 0x808080
                });
                const sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
                addCustomMarker(new THREE.Vector3(0, 0, -100));
            }
        );

        // İnteraktif noktaları oluştur
        createInteractivePoints();

        // Raycaster ve mouse için gerekli değişkenler
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Event listener'ları ekle
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('click', onMouseClick);
        closeButton.addEventListener('click', closePopup);

        // Back button click
        const backBtn = ensureBackButton();
        backBtn.onclick = () => {
            changePanorama(MAIN_PANORAMA);
        };

        // Animasyon döngüsünü başlat
        animate();
        
        console.log('Sahne başarıyla başlatıldı');
    } catch (error) {
        console.error('Sahne başlatılırken hata oluştu:', error);
    }
}

// İnteraktif noktaları oluştur
function createInteractivePoints() {
    try {
        hotelPoints.forEach(point => {
            const geometry = new THREE.SphereGeometry(0.3, 32, 32);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.8
            });
            const sphere = new THREE.Mesh(geometry, material);
            
            const radius = 499;
            const phi = Math.acos(point.position.y / radius);
            const theta = Math.atan2(point.position.x, point.position.z);
            
            sphere.position.x = radius * Math.sin(phi) * Math.cos(theta);
            sphere.position.y = radius * Math.sin(phi) * Math.sin(theta);
            sphere.position.z = radius * Math.cos(phi);
            
            sphere.userData = {
                title: point.title,
                description: point.description
            };
            
            scene.add(sphere);
            interactiveObjects.push(sphere);
        });
        console.log('İnteraktif noktalar oluşturuldu');
    } catch (error) {
        console.error('İnteraktif noktalar oluşturulurken hata:', error);
    }
}

function addCustomMarker(markerPosition) {
    document.querySelectorAll('.marker-container').forEach(e => e.remove());

    const markerDiv = document.createElement('div');
    markerDiv.className = 'marker-container';
    markerDiv.style.cursor = 'pointer';

    const circleDiv = document.createElement('div');
    circleDiv.className = 'marker-circle';
    const img = document.createElement('img');
    img.src = MAIN_PANORAMA;
    circleDiv.appendChild(img);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'marker-label';
    labelDiv.textContent = 'Giriş';

    const lineDiv = document.createElement('div');
    lineDiv.className = 'marker-line';
    const dotDiv = document.createElement('div');
    dotDiv.className = 'marker-dot';

    markerDiv.appendChild(circleDiv);
    markerDiv.appendChild(labelDiv);
    markerDiv.appendChild(lineDiv);
    markerDiv.appendChild(dotDiv);
    document.body.appendChild(markerDiv);

    markerDiv.addEventListener('click', function(e) {
        e.stopPropagation();
        changePanorama(
            'GS__0363.JPG',
            true,
            {
                img: 'GS__0363.JPG',
                title: 'Oda 101',
                desc: 'Bu oda demo amaçlıdır. Geniş, ferah ve manzaralıdır. <br> Özellikler: <ul><li>Çift kişilik yatak</li><li>Klima</li><li>Ücretsiz Wi-Fi</li></ul>'
            }
        );
    });

    function updateMarkerPosition() {
        const vector = markerPosition.clone();
        vector.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
        markerDiv.style.left = `${x}px`;
        markerDiv.style.top = `${y}px`;
        markerDiv.style.display = (vector.z < 1) ? 'block' : 'none';
    }

    function animateMarker() {
        updateMarkerPosition();
        requestAnimationFrame(animateMarker);
    }
    animateMarker();
}

// Pencere boyutu değiştiğinde
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Mouse tıklama olayı
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        showPopup(object.userData.title, object.userData.description);
    }
}

// Popup göster
function showPopup(title, description) {
    popupTitle.textContent = title;
    popupDescription.textContent = description;
    popup.style.display = 'block';
}

// Popup kapat
function closePopup() {
    popup.style.display = 'none';
}

// Animasyon döngüsü
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Yeni panorama yükleme fonksiyonu
let currentSphere = null;
function changePanorama(imgSrc, showPanel = false, panelData = null) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        imgSrc,
        function(texture) {
            if (currentSphere) {
                scene.remove(currentSphere);
            }
            const geometry = new THREE.SphereGeometry(500, 60, 40);
            geometry.scale(-1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ map: texture });
            const sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);
            currentSphere = sphere;

            // Butonun görünürlüğünü ayarla
            const backBtn = ensureBackButton();
            if (imgSrc !== MAIN_PANORAMA) {
                backBtn.style.display = 'block';
                if (showPanel && panelData) {
                    showSidePanel(panelData.img, panelData.title, panelData.desc);
                }
            } else {
                backBtn.style.display = 'none';
                hideSidePanel();
            }
        },
        undefined,
        function(error) {
            alert('Görsel yüklenemedi!');
        }
    );
}

// Sayfayı yükle
window.addEventListener('load', init); 