'use memo';

import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirect to login page as the entry point
  redirect('/login')
}
