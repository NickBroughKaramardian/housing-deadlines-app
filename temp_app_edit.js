  }, []);

  // Initialize theme service
  useEffect(() => {
    try {
      // Initialize theme service - this will load saved theme and dark mode settings
      console.log("Initializing theme service...");
      // The themeService constructor automatically loads from localStorage and applies the theme
    } catch (error) {
      console.error("Error initializing theme service:", error);
    }
  }, []);

  const handleInstallClick = async () => {
