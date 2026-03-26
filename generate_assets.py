from PIL import Image, ImageDraw, ImageFont
import os

# Set up output directory
output_dir = os.path.dirname(os.path.abspath(__file__))

# Card dimensions
width, height = 300, 400

# Level definitions
levels = {
    'Asset_1': {
        'title': 'EASY',
        'emoji': '🏀',
        'color': '#4ADE80',  # Green
        'difficulty': 'Beginner',
        'description': 'Static Rim'
    },
    'Asset_3': {
        'title': 'HARD',
        'emoji': '🏀',
        'color': '#FBBF24',  # Amber
        'difficulty': 'Intermediate',
        'description': 'Moving Rim'
    },
    'Asset_4': {
        'title': 'INSANE',
        'emoji': '🏀',
        'color': '#EF4444',  # Red
        'difficulty': 'Expert',
        'description': 'Fast Moving Rim'
    },
    'Asset_6': {
        'title': 'LEGENDARY',
        'emoji': '🏀',
        'color': '#A78BFA',  # Purple
        'difficulty': 'Master',
        'description': 'Ultra Speed'
    }
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_level_card(filename, level_data):
    """Create a level selection card image"""
    # Create base image with dark background
    img = Image.new('RGBA', (width, height), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img)
    
    # Get color
    color = hex_to_rgb(level_data['color'])
    
    # Draw gradient-like top border
    border_height = 8
    for i in range(border_height):
        alpha = int(255 * (1 - i / border_height))
        draw.rectangle([(0, i), (width, i+1)], fill=color + (alpha,))
    
    # Draw main content area with border
    border_width = 2
    draw.rectangle(
        [(border_width, border_width), (width - border_width, height - border_width)],
        outline=color + (200,),
        width=border_width
    )
    
    # Draw rounded corners effect (simple)
    corner_radius = 20
    for x in [corner_radius, width - corner_radius]:
        for y in [corner_radius, height - corner_radius]:
            draw.arc([(x-corner_radius, y-corner_radius), (x+corner_radius, y+corner_radius)], 
                    0, 360, fill=color + (200,), width=border_width)
    
    try:
        # Try to use a nice font, fall back to default if not available
        title_font = ImageFont.truetype("arial.ttf", 48)
        subtitle_font = ImageFont.truetype("arial.ttf", 28)
        desc_font = ImageFont.truetype("arial.ttf", 16)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
    
    # Draw emoji/ball
    emoji_text = level_data['emoji']
    bbox = draw.textbbox((0, 0), emoji_text, font=subtitle_font)
    emoji_width = bbox[2] - bbox[0]
    draw.text(((width - emoji_width) // 2, 40), emoji_text, font=subtitle_font, fill=(255, 255, 255, 255))
    
    # Draw title
    title = level_data['title']
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = bbox[2] - bbox[0]
    draw.text(((width - title_width) // 2, 110), title, font=title_font, fill=color + (255,))
    
    # Draw difficulty level
    difficulty = level_data['difficulty']
    bbox = draw.textbbox((0, 0), difficulty, font=subtitle_font)
    diff_width = bbox[2] - bbox[0]
    draw.text(((width - diff_width) // 2, 180), difficulty, font=subtitle_font, fill=(229, 231, 235, 255))
    
    # Draw description
    description = level_data['description']
    bbox = draw.textbbox((0, 0), description, font=desc_font)
    desc_width = bbox[2] - bbox[0]
    draw.text(((width - desc_width) // 2, 240), description, font=desc_font, fill=(156, 163, 175, 255))
    
    # Draw tap to start hint
    hint = "TAP TO START"
    try:
        hint_font = ImageFont.truetype("arial.ttf", 14)
    except:
        hint_font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), hint, font=hint_font)
    hint_width = bbox[2] - bbox[0]
    draw.text(((width - hint_width) // 2, 330), hint, font=hint_font, fill=color + (180,))
    
    # Save the image
    filepath = os.path.join(output_dir, f"{filename}.png")
    img.save(filepath, 'PNG')
    print(f"Created: {filepath}")

# Create all level cards
for filename, level_data in levels.items():
    create_level_card(filename, level_data)

print("\nAll assets created successfully!")
