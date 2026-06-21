/**
 * Shared registration / program / volunteer option catalog.
 * This is the single source of truth used by:
 *   - the public registration form (public/register.html)
 *   - the admin dashboard filters (public/admin.html)
 *   - server-side validation (server.js)
 *
 * Keep IDs stable (they are stored with each record). Labels can change freely.
 */

// Ministries / sections a person can register to take part in.
const PROGRAMS = [
  { id: 'faith_dimension', label: 'Faith Dimension (Bible Teaching)' },
  { id: 'zion_worship', label: 'Zion Worship' },
  { id: 'holy_ghost_assembly', label: 'Holy Ghost Assembly' },
  { id: 'gospel_revolution', label: 'Gospel Revolution (Evangelism)' },
  { id: 'never_again', label: 'Never Again (Deliverance)' },
  { id: 'global_response', label: 'Global Response (Humanitarian)' },
  { id: 'compassion_works', label: 'Compassion Works (Outreach)' },
  { id: 'ministry_school', label: 'Ministry / Bible School' },
  { id: 'divine_episodes', label: 'Divine Episodes (Media & Teaching)' },
  { id: 'prayer_force', label: 'Prayer Force' },
  { id: 'holy_land_adventure', label: 'Holy Land Adventure (Trips)' },
];

// Scheduled events/services a person can register to attend.
const EVENTS = [
  { id: 'crusade_2026', label: 'Global Holy Ghost Crusade 2026' },
  { id: 'divine_encounter', label: 'Night of Divine Encounter (Monthly Vigil)' },
  { id: 'ministry_school_cohort', label: 'Supernatural Ministry School (Next Cohort)' },
  { id: 'sunday_service', label: 'Sunday Service (First-time Visitor)' },
  { id: 'midweek_service', label: 'Midweek Service' },
  { id: 'other_event', label: 'Other / Upcoming Service' },
];

// Volunteer roles, grouped by area. `group` matches the four areas chosen in setup.
const VOLUNTEER_ROLES = [
  // Worship, Media & Ushering
  { id: 'worship_music', label: 'Worship & Music Team', group: 'Worship, Media & Ushering' },
  { id: 'media_production', label: 'Media & Production (Divine Episodes)', group: 'Worship, Media & Ushering' },
  { id: 'ushering_hospitality', label: 'Ushering & Hospitality', group: 'Worship, Media & Ushering' },

  // Prayer & Outreach
  { id: 'prayer_force', label: 'Prayer Force', group: 'Prayer & Outreach' },
  { id: 'evangelism', label: 'Evangelism & Outreach (Gospel Revolution)', group: 'Prayer & Outreach' },
  { id: 'compassion', label: 'Compassion / Humanitarian (Compassion Works)', group: 'Prayer & Outreach' },
  { id: 'global_response', label: 'Global Response / Never Again', group: 'Prayer & Outreach' },

  // Teaching & Kids
  { id: 'childrens_ministry', label: "Children's Ministry", group: 'Teaching & Kids' },
  { id: 'teaching_discipleship', label: 'Teaching & Discipleship (Ministry School)', group: 'Teaching & Kids' },
  { id: 'followup_counseling', label: 'Follow-up & Counseling', group: 'Teaching & Kids' },

  // Events & Bookstore
  { id: 'events_logistics', label: 'Events & Crusade Logistics', group: 'Events & Bookstore' },
  { id: 'bookstore', label: 'Bookstore / Store', group: 'Events & Bookstore' },
  { id: 'administration', label: 'Administration & Office', group: 'Events & Bookstore' },
];

// Availability options for volunteers.
const AVAILABILITY = [
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' },
  { id: 'services', label: 'Service times only' },
  { id: 'events', label: 'Special events only' },
  { id: 'remote', label: 'Remote / Online' },
];

// Registration types (top-level intent of the form).
const REG_TYPES = [
  { id: 'event', label: 'Attend an Event / Service' },
  { id: 'program', label: 'Join a Program / Ministry' },
  { id: 'volunteer', label: 'Volunteer / Serve' },
];

module.exports = { PROGRAMS, EVENTS, VOLUNTEER_ROLES, AVAILABILITY, REG_TYPES };
