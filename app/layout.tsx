import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'TasteTrip — Your next cultural adventure',description:'Discover cities through the films, artists and places you love. Build an itinerary that feels like you.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
