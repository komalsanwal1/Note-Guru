
const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-center gap-4 md:h-20 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          &copy; {currentYear} NotesGuru. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
