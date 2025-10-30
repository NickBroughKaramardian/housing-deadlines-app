import React, { useState } from 'react';
import { useAuth } from './Auth';

// Hobbies emojis
const HOBBIES_ICONS = [
  // Sports & Activities
  { id: 'soccer', name: 'Soccer Ball', icon: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'football', name: 'Football', icon: '🏈' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'golf', name: 'Golf', icon: '⛳' },
  { id: 'swimming', name: 'Swimming', icon: '🏊' },
  { id: 'cycling', name: 'Cycling', icon: '🚴' },
  { id: 'running', name: 'Running', icon: '🏃' },
  { id: 'yoga', name: 'Yoga', icon: '🧘' },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐' },
  { id: 'baseball', name: 'Baseball', icon: '⚾' },
  { id: 'rugby', name: 'Rugby', icon: '🏉' },
  { id: 'badminton', name: 'Badminton', icon: '🏸' },
  { id: 'table-tennis', name: 'Table Tennis', icon: '🏓' },
  { id: 'bowling', name: 'Bowling', icon: '🎳' },
  { id: 'archery', name: 'Archery', icon: '🏹' },
  
  // Creative Hobbies
  { id: 'painting', name: 'Painting', icon: '🎨' },
  { id: 'photography', name: 'Photography', icon: '📸' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'dancing', name: 'Dancing', icon: '💃' },
  { id: 'writing', name: 'Writing', icon: '✍️' },
  { id: 'reading', name: 'Reading', icon: '📖' },
  { id: 'book', name: 'Book', icon: '📚' },
  { id: 'cooking', name: 'Cooking', icon: '👨‍🍳' },
  { id: 'chess', name: 'Chess', icon: '♟️' },
  { id: 'puzzle', name: 'Puzzle', icon: '🧩' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  
  // Outdoor Hobbies
  { id: 'hiking', name: 'Hiking', icon: '🏔' },
  { id: 'camping', name: 'Camping', icon: '⛺' },
  { id: 'fishing', name: 'Fishing', icon: '🎣' },
  { id: 'gardening', name: 'Gardening', icon: '🌱' },
  { id: 'rock-climbing', name: 'Rock Climbing', icon: '🧗' },
  { id: 'surfing', name: 'Surfing', icon: '🏄' },
  { id: 'skiing', name: 'Skiing', icon: '⛷' },
  { id: 'snowboarding', name: 'Snowboarding', icon: '🏂' },
  { id: 'kayaking', name: 'Kayaking', icon: '🛶' },
  { id: 'biking', name: 'Biking', icon: '🚲' },
  
  // Other Hobbies
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'compass', name: 'Compass', icon: '🧭' },
  { id: 'map', name: 'Map', icon: '🗺️' },
  { id: 'backpack', name: 'Backpack', icon: '🎒' },
  { id: 'binoculars', name: 'Binoculars', icon: '🔭' },
  { id: 'telescope', name: 'Telescope', icon: '🔭' },
  { id: 'camera', name: 'Camera', icon: '📷' },
  { id: 'video-camera', name: 'Video Camera', icon: '📹' },
  { id: 'drone', name: 'Drone', icon: '🚁' },
  { id: 'rocket', name: 'Rocket', icon: '🚀' },
  { id: 'trophy', name: 'Trophy', icon: '🏆' },
  { id: 'lightbulb', name: 'Lightbulb', icon: '💡' },
  { id: 'fire', name: 'Fire', icon: '🔥' },
  { id: 'heart', name: 'Heart', icon: '❤️' },
  { id: 'diamond', name: 'Diamond', icon: '💎' },
  { id: 'crown', name: 'Crown', icon: '👑' },
];

// Weather emojis
const WEATHER_ICONS = [
  { id: 'sun', name: 'Sun', icon: '☀️' },
  { id: 'moon', name: 'Moon', icon: '🌙' },
  { id: 'star', name: 'Star', icon: '⭐' },
  { id: 'rain', name: 'Rain', icon: '🌧️' },
  { id: 'snow', name: 'Snow', icon: '❄️' },
  { id: 'cloud', name: 'Cloud', icon: '☁️' },
  { id: 'lightning', name: 'Lightning', icon: '⚡' },
  { id: 'wind', name: 'Wind', icon: '💨' },
  { id: 'fog', name: 'Fog', icon: '🌫️' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
  { id: 'thunderstorm', name: 'Thunderstorm', icon: '⛈️' },
  { id: 'snowflake', name: 'Snowflake', icon: '❄️' },
  { id: 'umbrella', name: 'Umbrella', icon: '☂️' },
  { id: 'partly-cloudy', name: 'Partly Cloudy', icon: '⛅' },
  { id: 'night', name: 'Night', icon: '🌃' },
  { id: 'sunrise', name: 'Sunrise', icon: '🌅' },
  { id: 'sunset', name: 'Sunset', icon: '🌇' },
  { id: 'tornado', name: 'Tornado', icon: '🌪️' },
  { id: 'tsunami', name: 'Tsunami', icon: '🌊' },
  { id: 'volcano', name: 'Volcano', icon: '🌋' },
];

// Locations emojis
const LOCATIONS_ICONS = [
  { id: 'tree', name: 'Tree', icon: '🌳' },
  { id: 'flower', name: 'Flower', icon: '🌸' },
  { id: 'mountain', name: 'Mountain', icon: '🏔️' },
  { id: 'ocean', name: 'Ocean', icon: '🌊' },
  { id: 'leaf', name: 'Leaf', icon: '🍃' },
  { id: 'beach', name: 'Beach', icon: '🏖️' },
  { id: 'forest', name: 'Forest', icon: '🌲' },
  { id: 'desert', name: 'Desert', icon: '🏜️' },
  { id: 'waterfall', name: 'Waterfall', icon: '🌊' },
  { id: 'lake', name: 'Lake', icon: '🏞️' },
  { id: 'river', name: 'River', icon: '🌊' },
  { id: 'island', name: 'Island', icon: '🏝️' },
  { id: 'city', name: 'City', icon: '🏙️' },
  { id: 'house', name: 'House', icon: '🏠' },
  { id: 'building', name: 'Building', icon: '🏢' },
  { id: 'castle', name: 'Castle', icon: '🏰' },
  { id: 'bridge', name: 'Bridge', icon: '🌉' },
  { id: 'statue', name: 'Statue', icon: '🗽' },
  { id: 'tower', name: 'Tower', icon: '🗼' },
  { id: 'temple', name: 'Temple', icon: '⛩️' },
  { id: 'church', name: 'Church', icon: '⛪' },
  { id: 'mosque', name: 'Mosque', icon: '🕌' },
  { id: 'synagogue', name: 'Synagogue', icon: '🕍' },
  { id: 'school', name: 'School', icon: '🏫' },
  { id: 'hospital', name: 'Hospital', icon: '🏥' },
  { id: 'bank', name: 'Bank', icon: '🏦' },
  { id: 'hotel', name: 'Hotel', icon: '🏨' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { id: 'cafe', name: 'Cafe', icon: '☕' },
  { id: 'bar', name: 'Bar', icon: '🍺' },
  { id: 'gas-station', name: 'Gas Station', icon: '⛽' },
  { id: 'parking', name: 'Parking', icon: '🅿️' },
  { id: 'airport', name: 'Airport', icon: '✈️' },
  { id: 'train-station', name: 'Train Station', icon: '🚉' },
  { id: 'bus-station', name: 'Bus Station', icon: '🚏' },
  { id: 'subway', name: 'Subway', icon: '🚇' },
  { id: 'port', name: 'Port', icon: '⚓' },
  { id: 'lighthouse', name: 'Lighthouse', icon: '🗼' },
  { id: 'windmill', name: 'Windmill', icon: '💨' },
  { id: 'farm', name: 'Farm', icon: '🚜' },
  { id: 'factory', name: 'Factory', icon: '🏭' },
  { id: 'construction', name: 'Construction', icon: '🏗️' },
  { id: 'ruins', name: 'Ruins', icon: '🏛️' },
  { id: 'cave', name: 'Cave', icon: '🕳️' },
  { id: 'canyon', name: 'Canyon', icon: '🏞️' },
  { id: 'glacier', name: 'Glacier', icon: '🧊' },
  { id: 'reef', name: 'Reef', icon: '🪸' },
  { id: 'volcano-location', name: 'Volcano', icon: '🌋' },
];

// People emojis
const PEOPLE_ICONS = [
  { id: 'person', name: 'Person', icon: '👤' },
  { id: 'boy', name: 'Boy', icon: '👦' },
  { id: 'girl', name: 'Girl', icon: '👧' },
  { id: 'man', name: 'Man', icon: '👨' },
  { id: 'woman', name: 'Woman', icon: '👩' },
  { id: 'baby', name: 'Baby', icon: '👶' },
  { id: 'elderly-man', name: 'Elderly Man', icon: '👴' },
  { id: 'elderly-woman', name: 'Elderly Woman', icon: '👵' },
  { id: 'person-blonde', name: 'Blonde Person', icon: '👱' },
  { id: 'person-red-hair', name: 'Red Hair Person', icon: '👨‍🦰' },
  { id: 'person-curly-hair', name: 'Curly Hair Person', icon: '👨‍🦱' },
  { id: 'person-bald', name: 'Bald Person', icon: '👨‍🦲' },
  { id: 'person-white-hair', name: 'White Hair Person', icon: '👨‍🦳' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'couple', name: 'Couple', icon: '👫' },
  { id: 'two-men', name: 'Two Men', icon: '👬' },
  { id: 'two-women', name: 'Two Women', icon: '👭' },
  { id: 'dancers', name: 'Dancers', icon: '💃' },
  { id: 'people-holding-hands', name: 'People Holding Hands', icon: '🤝' },
  { id: 'group', name: 'Group', icon: '👥' },
  { id: 'crowd', name: 'Crowd', icon: '👥' },
  { id: 'athlete', name: 'Athlete', icon: '🏃' },
  { id: 'swimmer', name: 'Swimmer', icon: '🏊' },
  { id: 'cyclist', name: 'Cyclist', icon: '🚴' },
  { id: 'yogi', name: 'Yogi', icon: '🧘' },
  { id: 'climber', name: 'Climber', icon: '🧗' },
  { id: 'surfer', name: 'Surfer', icon: '🏄' },
  { id: 'skier', name: 'Skier', icon: '⛷' },
  { id: 'snowboarder', name: 'Snowboarder', icon: '🏂' },
  { id: 'kayaker', name: 'Kayaker', icon: '🛶' },
  { id: 'biker', name: 'Biker', icon: '🚲' },
  { id: 'artist', name: 'Artist', icon: '🎨' },
  { id: 'photographer', name: 'Photographer', icon: '📸' },
  { id: 'musician', name: 'Musician', icon: '🎵' },
  { id: 'dancer', name: 'Dancer', icon: '💃' },
  { id: 'writer', name: 'Writer', icon: '✍️' },
  { id: 'reader', name: 'Reader', icon: '📖' },
  { id: 'chef', name: 'Chef', icon: '👨‍🍳' },
  { id: 'player', name: 'Player', icon: '🎮' },
  { id: 'traveler', name: 'Traveler', icon: '✈️' },
  { id: 'explorer', name: 'Explorer', icon: '🧭' },
  { id: 'photographer-person', name: 'Photographer', icon: '📷' },
  { id: 'scientist', name: 'Scientist', icon: '🔬' },
  { id: 'doctor', name: 'Doctor', icon: '👨‍⚕️' },
  { id: 'teacher', name: 'Teacher', icon: '👨‍🏫' },
  { id: 'student', name: 'Student', icon: '👨‍🎓' },
  { id: 'worker', name: 'Worker', icon: '👷' },
  { id: 'farmer', name: 'Farmer', icon: '👨‍🌾' },
  { id: 'cook', name: 'Cook', icon: '👨‍🍳' },
  { id: 'mechanic', name: 'Mechanic', icon: '👨‍🔧' },
  { id: 'pilot', name: 'Pilot', icon: '👨‍✈️' },
  { id: 'sailor', name: 'Sailor', icon: '👨‍✈️' },
  { id: 'astronaut', name: 'Astronaut', icon: '👨‍🚀' },
  { id: 'firefighter', name: 'Firefighter', icon: '👨‍🚒' },
  { id: 'police', name: 'Police', icon: '👮' },
  { id: 'detective', name: 'Detective', icon: '🕵️' },
  { id: 'guard', name: 'Guard', icon: '💂' },
  { id: 'ninja', name: 'Ninja', icon: '🥷' },
  { id: 'superhero', name: 'Superhero', icon: '🦸' },
  { id: 'wizard', name: 'Wizard', icon: '🧙' },
  { id: 'fairy', name: 'Fairy', icon: '🧚' },
  { id: 'vampire', name: 'Vampire', icon: '🧛' },
  { id: 'zombie', name: 'Zombie', icon: '🧟' },
  { id: 'genie', name: 'Genie', icon: '🧞' },
  { id: 'merperson', name: 'Merperson', icon: '🧜' },
  { id: 'elf', name: 'Elf', icon: '🧝' },
  { id: 'angel', name: 'Angel', icon: '👼' },
  { id: 'baby-angel', name: 'Baby Angel', icon: '👼' },
  { id: 'santa', name: 'Santa', icon: '🎅' },
  { id: 'mrs-claus', name: 'Mrs. Claus', icon: '🤶' },
  { id: 'princess', name: 'Princess', icon: '👸' },
  { id: 'prince', name: 'Prince', icon: '🤴' },
  { id: 'bride', name: 'Bride', icon: '👰' },
  { id: 'groom', name: 'Groom', icon: '🤵' },
  { id: 'pregnant-woman', name: 'Pregnant Woman', icon: '🤰' },
  { id: 'breast-feeding', name: 'Breast Feeding', icon: '🤱' },
  { id: 'person-feeding-baby', name: 'Person Feeding Baby', icon: '🧑‍🍼' },
  { id: 'person-in-wheelchair', name: 'Person in Wheelchair', icon: '🧑‍🦽' },
  { id: 'person-with-cane', name: 'Person with Cane', icon: '🧑‍🦯' },
  { id: 'person-with-prosthetic-leg', name: 'Person with Prosthetic Leg', icon: '🧑‍🦿' },
  { id: 'person-with-hearing-aid', name: 'Person with Hearing Aid', icon: '🧑‍🦻' },
  { id: 'person-with-white-cane', name: 'Person with White Cane', icon: '🧑‍🦯' },
  { id: 'person-in-motorized-wheelchair', name: 'Person in Motorized Wheelchair', icon: '🧑‍🦼' },
  { id: 'person-in-manual-wheelchair', name: 'Person in Manual Wheelchair', icon: '🧑‍🦽' },
];

// Combined icons for backward compatibility
const PROFILE_ICONS = [...HOBBIES_ICONS, ...WEATHER_ICONS, ...LOCATIONS_ICONS, ...PEOPLE_ICONS];

export default function UserMenu() {
  const { userProfile, signOutUser, DEPARTMENT_NAMES } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProfileIcon = () => {
    if (userProfile?.profileIcon) {
      const icon = PROFILE_ICONS.find(icon => icon.id === userProfile.profileIcon);
      return icon ? icon.icon : null;
    }
    return null;
  };

  const getProfileDisplay = () => {
    const icon = getProfileIcon();
    if (icon) {
      return (
        <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-lg text-white shadow-sm aspect-square">
          {icon}
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-sm font-bold text-white shadow-sm aspect-square">
          {getInitials(userProfile?.displayName)}
        </div>
      );
    }
  };

  const getDepartmentDisplay = () => {
    if (!userProfile?.departments || userProfile.departments.length === 0) {
      return null;
    }
    
    if (userProfile.departments.length === 1) {
      const departmentId = userProfile.departments[0];
      return DEPARTMENT_NAMES[departmentId] || departmentId;
    } else {
      return 'Multiple Departments';
    }
  };

  if (!userProfile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        {getProfileDisplay()}
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              {getProfileDisplay()}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {userProfile.displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userProfile.email}
                </p>
                <p className="text-xs text-theme-primary font-medium capitalize">
                  {userProfile.role === 'developer' ? 'Developer' : userProfile.role}
                </p>
                {getDepartmentDisplay() && (
                  <p className="text-xs text-gray-600 dark:text-gray-500 font-medium">
                    {getDepartmentDisplay()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={signOutUser}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
} 