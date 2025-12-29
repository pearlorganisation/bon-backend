import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    name: { type: String }, // e.g., "Deluxe Room"
    capacity: { type: Number, default: 2 },
    pricePerNight: { type: Number, required: true },
    discount: {
      type: Number, // percent or flat
      default: 0,
    },
    // How many physical rooms of this exact type exist in the property
    numberOfRooms: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    typeOfRoom: {
      type: String,
      enum: ["single", "double", "deluxe", "suite", "triple", "family"],
      default: "single",
      required: true,
    },
    // Legacy generic array
    amenities: [String],

    bedType: {
      type: String,
      enum: ["single", "double", "queen", "king", "twin", "sofa-bed"],
      required: true,
      default: "single",
    },
    bedCount: { type: Number, default: 1 },

    // ✅ Dimensions
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      unit: { type: String, enum: ["ft", "m"], default: "ft" },
    },

    images: [{ secure_url: String, public_id: String }],
    videos: [{ secure_url: String, public_id: String }],

    // ✅ Bathroom Basic Info
    bathroomType: {
      type: String,
      enum: ["private", "shared", "ensuite", "external"],
      default: "private",
    },
    bathroomCount: { type: Number, default: 1 },
    distanceToBathroom: {
      value: { type: Number, default: 0 },
      unit: { type: String, enum: ["m", "ft"], default: "m" },
    },
    // Legacy bathroom amenities array
    bathroomAmenities: [String],

    // =========================================================
    // ✅ NEW FIELDS FROM IMAGES (Grouped by Section)
    // =========================================================

    // 1. Services & Extras
    servicesAndExtras: {
      wakeUpService: { type: Boolean, default: false },
      roomService: { type: Boolean, default: false },
      laundryService: { type: Boolean, default: false },
      dailyHousekeeping: { type: Boolean, default: false },
      suitPress: { type: Boolean, default: false },
    },

    // 2. Accessibility
    accessibility: {
      accessibleByElevator: { type: Boolean, default: false },
      wheelchairAccessible: { type: Boolean, default: false },
      adaptedBath: { type: Boolean, default: false },
      lowerSink: { type: Boolean, default: false },
      rollInShower: { type: Boolean, default: false },
    },

    // 3. Safety & Security
    safetyAndSecurity: {
      smokeAlarm: { type: Boolean, default: false },
      cctvOutside: { type: Boolean, default: false },
      fireExtinguisher: { type: Boolean, default: false },
      firstAidKit: { type: Boolean, default: false },
      carbonMonoxideDetector: { type: Boolean, default: false },
    },

    // 4. Activities & Sports
    activitiesAndSports: {
      hiking: { type: Boolean, default: false },
      bicycleRental: { type: Boolean, default: false },
      tennisCourt: { type: Boolean, default: false },
      swimmingPool: { type: Boolean, default: false },
      heatedPool: { type: Boolean, default: false },
      infinityPool: { type: Boolean, default: false },
    },

    // 5. Bar & Entertainment
    barAndEntertainment: {
      bar: { type: Boolean, default: false },
      movieNights: { type: Boolean, default: false },
      liveMusic: { type: Boolean, default: false },
      karaoke: { type: Boolean, default: false },
      nightclubDj: { type: Boolean, default: false },
      boardGamesPuzzles: { type: Boolean, default: false },
    },

    // 6. Transportation
    transportation: {
      shuttleService: { type: Boolean, default: false },
      airportShuttle: { type: Boolean, default: false },
      carRental: { type: Boolean, default: false },
      bicycleParking: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
    },

    // 7. Pool & Spa
    poolAndSpa: {
      spa: { type: Boolean, default: false },
      sauna: { type: Boolean, default: false },
      hotTubJacuzzi: { type: Boolean, default: false },
      poolTowels: { type: Boolean, default: false },
      privatePool: { type: Boolean, default: false },
    },

    // 8. Cleaning Services
    cleaningServices: {
      dryCleaning: { type: Boolean, default: false },
      ironingService: { type: Boolean, default: false },
      laundry: { type: Boolean, default: false },
    },

    // 9. Front Desk & Services
    frontDeskServices: {
      concierge: { type: Boolean, default: false },
      twentyFourHourFrontDesk: { type: Boolean, default: false },
      baggageStorage: { type: Boolean, default: false },
      privateCheckInCheckOut: { type: Boolean, default: false },
      expressCheckInCheckOut: { type: Boolean, default: false },
      invoiceProvided: { type: Boolean, default: false },
    },

    // 10. Common Areas
    commonAreas: {
      garden: { type: Boolean, default: false },
      outdoorFurniture: { type: Boolean, default: false },
      sharedLoungeTVArea: { type: Boolean, default: false },
      terrace: { type: Boolean, default: false },
    },

    // 11. Kids & Family
    kidsAndFamily: {
      highChair: { type: Boolean, default: false },
      kidsMeals: { type: Boolean, default: false },
      babySafetyGates: { type: Boolean, default: false },
      strollers: { type: Boolean, default: false },
      playground: { type: Boolean, default: false },
    },

    // 12. Building Information
    buildingInfo: {
      totalFloors: { type: Number },
      constructionYear: { type: Number },
      elevatorAvailable: { type: Boolean, default: false },
    },

    // 13. Self Check-in Methods
    selfCheckIn: {
      lockboxProperty: { type: Boolean, default: false },
      lockboxSeparateLocation: { type: Boolean, default: false },
      mobileBluetooth: { type: Boolean, default: false },
      mobileInternet: { type: Boolean, default: false },
      preSharedPinCode: { type: Boolean, default: false },
      qrCodeScan: { type: Boolean, default: false },
      downloadableApp: { type: Boolean, default: false },
    },

    // 14. Bedding & Comfort
    beddingAndComfort: {
      linens: { type: Boolean, default: false },
      crib: { type: Boolean, default: false },
      cribLinen: { type: Boolean, default: false },
      fittedSheet: { type: Boolean, default: false },
      topSheet: { type: Boolean, default: false },
      blanket: { type: Boolean, default: false },
      extraBlankets: { type: Boolean, default: false },
      pillow: { type: Boolean, default: false },
      mattressProtector: { type: Boolean, default: false },
      towelsSheetsExtraFee: { type: Boolean, default: false },
    },

    // 15. Bathroom (Detailed Features)
    bathroomFeatures: {
      bathrobe: { type: Boolean, default: false },
      spaTub: { type: Boolean, default: false },
      showerCap: { type: Boolean, default: false },
      bathroomAmenities: { type: Boolean, default: false }, // General flag
      toiletWithGrabRails: { type: Boolean, default: false },
    },

    // 16. Room Facilities
    roomFacilities: {
      airConditioning: { type: Boolean, default: false },
      privacyCurtain: { type: Boolean, default: false },
      lockers: { type: Boolean, default: false },
      socketNearBed: { type: Boolean, default: false },
      roomSizeInfo: { type: Boolean, default: false },
      foldUpBed: { type: Boolean, default: false },
      sofaBed: { type: Boolean, default: false },
      wardrobeOrCloset: { type: Boolean, default: false },
      walkInCloset: { type: Boolean, default: false },
      extraLongBeds: { type: Boolean, default: false }, // > 6.5 ft
      fan: { type: Boolean, default: false },
      fireplace: { type: Boolean, default: false },
      interconnectingRooms: { type: Boolean, default: false },
      iron: { type: Boolean, default: false },
      ironingFacilities: { type: Boolean, default: false },
      safe: { type: Boolean, default: false },
      privateEntrance: { type: Boolean, default: false },
      soundproof: { type: Boolean, default: false },
      desk: { type: Boolean, default: false },
      carpeted: { type: Boolean, default: false },
    },

    // 17. Media & Technology
    mediaAndTechnology: {
      flatScreenTV: { type: Boolean, default: false },
      streamingService: { type: Boolean, default: false },
      gameConsole: { type: Boolean, default: false },
      bluRayPlayer: { type: Boolean, default: false },
      mobileHotspotDevice: { type: Boolean, default: false },
      laptopSafe: { type: Boolean, default: false },
      chargingAdapter: { type: Boolean, default: false },
    },

    // =========================================================

    // ✅ Partner-defined availability periods
    availability: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      },
    ],

    // Optional: blocked dates (maintenance, holidays)
    blockedDates: [
      {
        startDate: Date,
        endDate: Date,
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

roomSchema.virtual("Bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "roomId",
});

// To include virtuals in JSON output
roomSchema.set("toObject", { virtuals: true });
roomSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Room", roomSchema);
