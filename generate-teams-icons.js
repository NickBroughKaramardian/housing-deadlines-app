const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function generateTeamsIcons() {
    try {
        // Read the SVG file
        const svgPath = './public/CC_App_Icon.svg';
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        
        // Create a data URL for the SVG
        const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
        
        // Load the SVG image
        const image = await loadImage(dataUrl);
        
        // Define Teams icon sizes
        const teamsIcons = [
            { width: 192, height: 192, filename: 'color.png' },
            { width: 32, height: 32, filename: 'outline.png' }
        ];
        
        // Generate each Teams icon
        for (const icon of teamsIcons) {
            const canvas = createCanvas(icon.width, icon.height);
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.clearRect(0, 0, icon.width, icon.height);
            
            // Draw the image
            ctx.drawImage(image, 0, 0, icon.width, icon.height);
            
            // Save to teams-app-package directory
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(`./teams-app-package/${icon.filename}`, buffer);
            
            console.log(`Generated ${icon.filename}`);
        }
        
        console.log('Teams app icons generated successfully!');
        
    } catch (error) {
        console.error('Error generating Teams icons:', error);
        console.log('Note: If canvas is not installed, you can manually create the icons:');
        console.log('1. Open public/CC_App_Icon.svg in a browser');
        console.log('2. Take a screenshot and resize to 192x192 for color.png');
        console.log('3. Take a screenshot and resize to 32x32 for outline.png');
        console.log('4. Save both as PNG files in teams-app-package/');
    }
}

generateTeamsIcons(); 