import { loadHeaderFooter, myport, getUserValue } from './utils.mjs';

loadHeaderFooter()
const port = myport();
const user = getUserValue();

const main = document.querySelector('#main-content');
const section = document.createElement('section');
section.classList.add('section', 'image-upload-section');
section.setAttribute('id', 'image-upload-section');
section.innerHTML = `
<h2 class=section-heading>Image Upload</h2>    
<form id="imageForm">
        <div class="form-group">
        <label for="toolId">Tool ID:</label>
        <input type="text" id="deviceId" name="toolId" placeholder="Enter tool ID" value="TEST" required>
        </div>
        <div class="form-group">
        <label for="imagePicker">Choose an image:</label>
        <input type="file" id="imagePicker" accept="image/*">
        </div>
        <canvas id="imageCanvas" style="display: block; margin-top: 10px;"></canvas>
        <button type="button" id="saveImageButton">Save Image</button>
    </form>
`;

main.appendChild(section);

const imagePicker = document.getElementById('imagePicker');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const saveButton = document.getElementById('saveImageButton');

imagePicker.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                const maxSize = 300;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, width, height);
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }
});

saveButton.addEventListener('click', async () => {
    // const imageUrl = `${port}/image`; // Replace with your image URL
    canvas.toBlob(async (blob) => {
        if (blob) {
            try {
                const formData = new FormData();
                const deviceId = document.getElementById('deviceId').value.trim();
                const fileName = deviceId ? `${deviceId}.png` : 'resized-image.png';
                formData.append('image', blob, fileName);
                formData.append('deviceId', deviceId); // Add deviceId explicitly to formData

                // log the formData for debugging
                // console.log('FormData:', formData.get('image'), formData.get('deviceId'));

                if (!deviceId) {
                    alert('Tool ID is required.');
                    return;
                }

                const response = await fetch(`/image`, {
                    method: 'POST',
                    body: formData
                    // Do not set Content-Type; it will be automatically set by the browser for FormData
                });

                if (response.ok) {
                    alert('Image saved successfully!');
                } else {
                    alert('Failed to save image.');
                }
            } catch (error) {
                console.error('Error saving image:', error);
                alert('An error occurred while saving the image.');
            }
        }
    }, 'image/png');
});