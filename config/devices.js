import { devices } from "playwright";


export const captureDevices = [
  {
    name: "iPhone-SE",
    category: "mobile",
    settings: {
      ...devices["iPhone SE"],
    },
  },
  {
    name: "iPhone-13",
    category: "mobile",
    settings: {
      ...devices["iPhone 13"],
    },
  },
  {
    name: "iPhone-14-Pro-Max",
    category: "mobile",
    settings: {
      ...devices["iPhone 14 Pro Max"],
    },
  },
  {
    name: "Pixel-5",
    category: "mobile",
    settings: {
      ...devices["Pixel 5"],
    },
  },
  {
    name: "iPad-Mini",
    category: "tablet",
    settings: {
      ...devices["iPad Mini"],
    },
  },
  {
    name: "iPad-Pro-11",
    category: "tablet",
    settings: {
      ...devices["iPad Pro 11"],
    },
  },
  {
    name: "Mobile-360x800",
    category: "mobile",
    settings: {
      viewport: {
        width: 360,
        height: 800,
      },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    },
  },
  {
    name: "Tablet-768x1024",
    category: "tablet",
    settings: {
      viewport: {
        width: 768,
        height: 1024,
      },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    },
  },
  {
    name: "Desktop-1280x800",
    category: "desktop",
    settings: {
      viewport: {
        width: 1280,
        height: 800,
      },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
  {
    name: "Desktop-1440x900",
    category: "desktop",
    settings: {
      viewport: {
        width: 1440,
        height: 900,
      },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
  {
    name: "Desktop-1920x1080",
    category: "desktop",
    settings: {
      viewport: {
        width: 1920,
        height: 1080,
      },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
];
