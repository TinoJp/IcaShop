// Contact details shown in the footer.
// Leave a value as '' and that item is hidden automatically.
// Fill these in with the real details of the shop.

export type SiteConfig = {
  url: string;
  whatsapp: string;
  phone: string;
  email: string;
  location: string;
  social: {
    instagram: string;
    facebook: string;
    tiktok: string;
  };
};

export const siteConfig: SiteConfig = {
  url: 'https://www.icashop.co.tz',
  // Country code first, digits only, e.g. '255712345678'
  whatsapp: '+255684312982',
  // How the number should look on screen, e.g. '+255 712 345 678'
  phone: '+255684312982',
  email: 'abbybenjamin94@gmail.com',
  // e.g. 'Dar es Salaam, Tanzania'
  location: 'Mikocheni, Dar es Salaam, Tanzania',
  social: {
    // Full links, e.g. 'https://instagram.com/yourshop'
    instagram: 'https://www.instagram.com/abby_ica?mdxt=MTJ2eGd2Yzl5eXo3dw==',
    facebook: '',
    tiktok: '',
  },
};
