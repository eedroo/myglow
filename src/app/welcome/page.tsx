import { redirect } from 'next/navigation';

/** F11: a apresentação de slides deu lugar ao guia interactivo, que começa no dia de hoje. */
export default function WelcomePage() {
  redirect('/today');
}
