const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function generateIcons() {
    try {
        // Read the SVG file
        const svgPath = './public/CC_App_Icon.svg';
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        
        // Create a data URL for the SVG
        const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
        
        // Load the SVG image
        const image = await loadImage(dataUrl);
        
        // Define icon sizes
        const sizes = [
            { width: 192, height: 192, filename: 'logo192.png' },
            { width: 512, height: 512, filename: 'logo512.png' },
            { width: 180, height: 180, filename: 'apple-touch-icon.png' },
            { width: 32, height: 32, filename: 'favicon-32x32.png' },
            { width: 16, height: 16, filename: 'favicon-16x16.png' }
        ];
        
        // Generate each size
        for (const size of sizes) {
            const canvas = createCanvas(size.width, size.height);
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.clearRect(0, 0, size.width, size.height);
            
            // Draw the image
            ctx.drawImage(image, 0, 0, size.width, size.height);
            
            // Save to file
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(`./public/${size.filename}`, buffer);
            
            console.log(`Generated ${size.filename}`);
        }
        
        console.log('All icons generated successfully!');
        
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons(); 