import published from '../tutorials/published.json'

export default {
  index: 'Introduction',
  '--start': {
    type: 'separator',
    title: 'Get Started',
  },
  'getting-started': 'Sign up & first login',
  'setup-guide': 'Setup Guide',
  // Hidden until at least one tutorial has been listened to and published.
  tutorials: {
    title: 'Video Tutorials',
    display: Object.keys(published.videos).length ? 'normal' : 'hidden',
  },
  '--daily': {
    type: 'separator',
    title: 'Daily Workflow',
  },
  'navigation-and-search': 'Navigation & Search',
  dashboard: 'Dashboard',
  encounters: 'Encounters',
  messages: 'Messages',
  '--records': {
    type: 'separator',
    title: 'Records',
  },
  patients: 'Patients',
  '--templates': {
    type: 'separator',
    title: 'Templates & Content',
  },
  templates: 'SOAP & Discharge Templates',
  'email-templates': 'Email Templates',
  community: 'Community Templates',
  '--practice': {
    type: 'separator',
    title: 'Practice',
  },
  practice: 'Practice & Team',
  '--account': {
    type: 'separator',
    title: 'Your Account',
  },
  settings: 'Settings',
  '--reference': {
    type: 'separator',
    title: 'Technical Reference',
  },
  reference: 'Reference',
}
