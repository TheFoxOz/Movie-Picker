/**
 * PRACTICAL USAGE EXAMPLES
 * How to use the availability and trigger warning services
 */

import { initializeServices } from './services/service-initializer.js';
import { availabilityService } from './services/availability-service.js';
import { triggerWarningService } from './services/trigger-warning-service.js';
import { userProfileService } from './services/user-profile-revised.js';

// ============================================================================
// EXAMPLE 1: APP INITIALIZATION
// ============================================================================

async function initializeApp() {
    console.log('🚀 Starting Movie Picker...');
    
    // Initialize all services
    const success = await initializeServices();
    
    if (!success) {
        console.error('❌ Failed to initialize services');
        return;
    }
    
    console.log('✅ Services ready!');
    console.log('Region:', userProfileService.getRegionName());
    console.log('Platforms:', userProfileService.getSelectedPlatforms());
    console.log('Trigger categories enabled:', userProfileService.getEnabledCategories().length);
}

// ============================================================================
// EXAMPLE 2: ENRICH A SINGLE MOVIE
// ============================================================================

async function enrichMovie(movie) {
    console.log(`\n📽️ Enriching: ${movie.title}`);
    
    const userRegion = userProfileService.getRegion();
    const userPlatforms = userProfileService.getSelectedPlatforms();
    const enabledCategories = userProfileService.getEnabledCategories();
    const showDetails = userProfileService.profile.triggerWarnings.showAllWarnings;
    
    // Fetch availability and warnings in parallel
    const [availability, warnings] = await Promise.all([
        availabilityService.getAvailability(movie.id, userRegion),
        triggerWarningService.getWarnings(movie.id)
    ]);
    
    // Filter by user preferences
    const filteredAvailability = availabilityService.filterByUserPlatforms(
        availability,
        userPlatforms
    );
    
    const filteredWarnings = triggerWarningService.filterByUserPreferences(
        warnings,
        enabledCategories,
        showDetails
    );
    
    return {
        ...movie,
        availability: filteredAvailability,
        warnings: filteredWarnings,
        enriched: true
    };
}

// ============================================================================
// EXAMPLE 3: BATCH ENRICH MOVIES
// ============================================================================

async function enrichMovies(movies) {
    console.log(`\n📚 Enriching ${movies.length} movies...`);
    
    const enriched = await Promise.all(
        movies.map(movie => enrichMovie(movie))
    );
    
    // Filter: only show movies available on user's platforms
    const available = enriched.filter(m => m.availability.available);
    
    console.log(`✅ ${available.length} movies available on your platforms`);
    
    return available;
}

// ============================================================================
// EXAMPLE 4: DISPLAY AVAILABILITY
// ============================================================================

function displayAvailability(availability, container) {
    if (!availability.available) {
        container.innerHTML = `
            <div class="unavailable">
                <p>Not available in ${userProfileService.getRegionName()}</p>
                ${availability.link ? `
                    <a href="${availability.link}" target="_blank">View on TMDB</a>
                ` : ''}
            </div>
        `;
        return;
    }
    
    let html = `<div class="availability">`;
    html += `<h4>📺 Available in ${userProfileService.getRegionName()}</h4>`;
    
    // Streaming (flatrate)
    if (availability.providers.flatrate.length > 0) {
        html += `<div class="flatrate">
            <h5>Stream:</h5>
            <div class="platforms">`;
        availability.providers.flatrate.forEach(p => {
            html += `
                <div class="platform">
                    <img src="${p.logo}" alt="${p.name}" />
                    <span>${p.name}</span>
                </div>`;
        });
        html += `</div></div>`;
    }
    
    // Buy
    if (availability.providers.buy.length > 0) {
        html += `<div class="buy">
            <h5>Buy:</h5>
            <div class="platforms">`;
        availability.providers.buy.forEach(p => {
            html += `
                <div class="platform">
                    <img src="${p.logo}" alt="${p.name}" />
                    <span>${p.name}</span>
                </div>`;
        });
        html += `</div></div>`;
    }
    
    // Rent
    if (availability.providers.rent.length > 0) {
        html += `<div class="rent">
            <h5>Rent:</h5>
            <div class="platforms">`;
        availability.providers.rent.forEach(p => {
            html += `
                <div class="platform">
                    <img src="${p.logo}" alt="${p.name}" />
                    <span>${p.name}</span>
                </div>`;
        });
        html += `</div></div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

// ============================================================================
// EXAMPLE 5: DISPLAY TRIGGER WARNINGS
// ============================================================================

function displayWarnings(warnings, container) {
    if (!warnings.hasWarnings || warnings.categories.length === 0) {
        container.innerHTML = `
            <div class="no-warnings">
                <p>✓ No content warnings for your selected categories</p>
            </div>
        `;
        return;
    }
    
    let html = `<div class="warnings">`;
    html += `<h4>⚠️ Content Warnings</h4>`;
    
    warnings.categories.forEach(category => {
        html += `
            <div class="warning-category ${category.severity}">
                <div class="warning-summary">
                    <span class="icon">${category.icon}</span>
                    <span class="message">${category.spoilerFree}</span>
                    <span class="severity">${category.severity}</span>
                </div>`;
        
        // Show details if enabled
        if (category.showDetails && category.warnings.length > 0) {
            html += `
                <details class="warning-details">
                    <summary>
                        ⚠️ Show ${category.warnings.length} detailed warnings (may contain spoilers)
                    </summary>
                    <div class="warnings-list">`;
            
            category.warnings.forEach(warning => {
                html += `
                    <div class="warning-item">
                        <p class="question"><strong>${warning.question}</strong></p>
                        <p class="votes">
                            <span class="yes">Yes: ${warning.yesVotes}</span>
                            <span class="no">No: ${warning.noVotes}</span>
                            <span class="confidence ${warning.confidence.level}">
                                ${warning.confidence.display}
                            </span>
                        </p>
                    </div>`;
            });
            
            html += `
                    </div>
                </details>`;
        } else if (!category.showDetails) {
            html += `
                <p class="enable-details">
                    <small>
                        Detailed warnings hidden. 
                        <a href="#settings" onclick="enableWarningDetails(${category.id})">
                            Enable in settings
                        </a>
                    </small>
                </p>`;
        }
        
        html += `</div>`;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

// ============================================================================
// EXAMPLE 6: UPDATE USER PREFERENCES
// ============================================================================

// Change region
function changeRegion(regionCode) {
    console.log(`🌍 Changing region to: ${regionCode}`);
    
    userProfileService.updateRegion(regionCode);
    
    // Reload movies with new region
    reloadMovies();
}

// Toggle platform
function togglePlatform(platformName) {
    console.log(`📺 Toggling platform: ${platformName}`);
    
    userProfileService.togglePlatform(platformName);
    
    // Reload to filter by new platforms
    reloadMovies();
}

// Enable trigger category
function enableTriggerCategory(categoryId) {
    console.log(`⚠️ Enabling trigger category: ${categoryId}`);
    
    userProfileService.enableTriggerCategory(categoryId);
    
    // Reload to show new warnings
    reloadMovies();
}

// Enable detailed warnings for category
function enableWarningDetails(categoryId) {
    console.log(`⚠️ Enabling detailed warnings for category: ${categoryId}`);
    
    userProfileService.toggleShowAllWarnings(categoryId, true);
    
    // Reload to show details
    reloadMovies();
}

// ============================================================================
// EXAMPLE 7: COMPLETE MOVIE PAGE
// ============================================================================

async function displayMoviePage(movieId) {
    console.log(`\n🎬 Loading movie page for ID: ${movieId}`);
    
    // Get movie from TMDB
    const movie = await tmdb.fetchMovieDetails(movieId);
    
    // Enrich with availability + warnings
    const enriched = await enrichMovie(movie);
    
    // Display basic info
    document.getElementById('movie-title').textContent = movie.title;
    document.getElementById('movie-overview').textContent = movie.overview;
    document.getElementById('movie-poster').src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    
    // Display availability
    const availContainer = document.getElementById('availability-container');
    displayAvailability(enriched.availability, availContainer);
    
    // Display warnings
    const warningsContainer = document.getElementById('warnings-container');
    displayWarnings(enriched.warnings, warningsContainer);
    
    console.log('✅ Movie page loaded');
}

// ============================================================================
// EXAMPLE 8: HOME PAGE WITH FILTERS
// ============================================================================

async function loadHomePage() {
    console.log('\n🏠 Loading home page...');
    
    // Fetch popular movies from TMDB
    const movies = await tmdb.fetchPopularMovies();
    
    // Enrich all movies
    const enriched = await enrichMovies(movies);
    
    // Filter by availability
    const available = enriched.filter(m => m.availability.available);
    
    // Filter by critical warnings (optional)
    const safe = available.filter(m => {
        if (!m.warnings.hasWarnings) return true;
        
        // Check if any critical warnings
        const hasCritical = m.warnings.categories.some(cat => 
            cat.severity === 'critical'
        );
        
        return !hasCritical;
    });
    
    console.log(`Total movies: ${movies.length}`);
    console.log(`Available on your platforms: ${available.length}`);
    console.log(`Without critical warnings: ${safe.length}`);
    
    // Display
    displayMovieGrid(safe);
}

// ============================================================================
// EXAMPLE 9: SETTINGS PAGE
// ============================================================================

function renderSettingsPage() {
    const container = document.getElementById('settings-container');
    
    const profile = userProfileService.getProfile();
    
    container.innerHTML = `
        <div class="settings">
            <h2>⚙️ Settings</h2>
            
            <!-- Region -->
            <div class="setting-section">
                <h3>📍 Region</h3>
                <select id="region-select" onchange="changeRegion(this.value)">
                    <option value="US" ${profile.region === 'US' ? 'selected' : ''}>🇺🇸 United States</option>
                    <option value="GB" ${profile.region === 'GB' ? 'selected' : ''}>🇬🇧 United Kingdom</option>
                    <option value="FR" ${profile.region === 'FR' ? 'selected' : ''}>🇫🇷 France</option>
                    <option value="DE" ${profile.region === 'DE' ? 'selected' : ''}>🇩🇪 Germany</option>
                    <option value="CA" ${profile.region === 'CA' ? 'selected' : ''}>🇨🇦 Canada</option>
                </select>
            </div>
            
            <!-- Platforms -->
            <div class="setting-section">
                <h3>📺 Streaming Platforms</h3>
                ${['Netflix', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+', 'Hulu'].map(platform => `
                    <label>
                        <input type="checkbox" 
                               value="${platform}"
                               ${profile.selectedPlatforms.includes(platform) ? 'checked' : ''}
                               onchange="togglePlatform('${platform}')">
                        ${platform}
                    </label>
                `).join('')}
            </div>
            
            <!-- Trigger Warnings -->
            <div class="setting-section">
                <h3>⚠️ Trigger Warnings</h3>
                <button onclick="userProfileService.enableAllTriggers(); location.reload()">Enable All</button>
                <button onclick="userProfileService.disableAllTriggers(); location.reload()">Disable All</button>
                
                <!-- Categories will be rendered here -->
                <div id="trigger-categories"></div>
            </div>
        </div>
    `;
}

// ============================================================================
// EXPORT FOR USE
// ============================================================================

export {
    initializeApp,
    enrichMovie,
    enrichMovies,
    displayAvailability,
    displayWarnings,
    changeRegion,
    togglePlatform,
    enableTriggerCategory,
    enableWarningDetails,
    displayMoviePage,
    loadHomePage,
    renderSettingsPage
};
