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
    weeklyPrice: { type: Number, default: 0 },
    monthlyPrice: { type: Number, default: 0 },
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
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

    foodAndDrinksAmenities: {
      inHouseRestaurant: { type: Boolean, default: false },
      multiCuisineRestaurant: { type: Boolean, default: false },
      pureVegetarianRestaurant: { type: Boolean, default: false },
      onsiteCoffeeHouse: { type: Boolean, default: false },
      snackBar: { type: Boolean, default: false },
      rooftopDining: { type: Boolean, default: false },
      outdoorDiningArea: { type: Boolean, default: false },
      picnicArea: { type: Boolean, default: false },
      liveKitchen: { type: Boolean, default: false },

      breakfastAvailable: { type: Boolean, default: false },
      complimentaryBreakfast: { type: Boolean, default: false },
      buffetBreakfast: { type: Boolean, default: false },
      continentalBreakfast: { type: Boolean, default: false },
      americanBreakfast: { type: Boolean, default: false },
      asianBreakfast: { type: Boolean, default: false },
      vegetarianBreakfast: { type: Boolean, default: false },
      halalBreakfast: { type: Boolean, default: false },
      glutenFreeBreakfast: { type: Boolean, default: false },
      fullEnglishIrishBreakfast: { type: Boolean, default: false },

      bar: { type: Boolean, default: false },
      loungeBar: { type: Boolean, default: false },
      poolsideBar: { type: Boolean, default: false },
      happyHours: { type: Boolean, default: false },
      wineChampagneAvailable: { type: Boolean, default: false },
      minibarInRooms: { type: Boolean, default: false },

      teaCoffeeMakerInRoom: { type: Boolean, default: false },
      complimentaryTeaCoffee: { type: Boolean, default: false },
      juiceBar: { type: Boolean, default: false },
      vendingMachineDrinks: { type: Boolean, default: false },
      vendingMachineSnacks: { type: Boolean, default: false },

      breakfastInRoom: { type: Boolean, default: false },
      packedLunches: { type: Boolean, default: false },
      groceryDelivery: { type: Boolean, default: false },
      bbqFacilities: { type: Boolean, default: false },
      candleLightDinner: { type: Boolean, default: false },
      bonfireDining: { type: Boolean, default: false },

      kidMealsAvailable: { type: Boolean, default: false },
      kidFriendlyBuffet: { type: Boolean, default: false },
      specialDietMealsOnRequest: { type: Boolean, default: false },
      allergyFriendlyFood: { type: Boolean, default: false },
      veganFood: { type: Boolean, default: false },
      vegetarianFood: { type: Boolean, default: false },
      halalFood: { type: Boolean, default: false },
      jainFood: { type: Boolean, default: false },
      glutenFreeFood: { type: Boolean, default: false },
      babyFoodAvailable: { type: Boolean, default: false },
      seniorCitizenMealOptions: { type: Boolean, default: false },

      fruits: { type: Boolean, default: false },
      chocolatesCookies: { type: Boolean, default: false },
      welcomeDrink: { type: Boolean, default: false },
      localCuisineAvailable: { type: Boolean, default: false },
    },

    roomSpecifications: {
      dimensions: {
        length: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        unit: { type: String, enum: ["ft", "m"], default: "ft" },
      },
      bed: {
        bedLength: { type: Number, default: 0 },
        bedWidth: { type: Number, default: 0 },
        bedHeightFromFloor: { type: Number, default: 0 },
        distanceFromBedToWallLeft: { type: Number, default: 0 },
        distanceFromBedToWallRight: { type: Number, default: 0 },
        distanceFromBedToWallFront: { type: Number, default: 0 },
        distanceFromBedToDoor: { type: Number, default: 0 },
        distanceFromBedToBathroomDoor: { type: Number, default: 0 },
        distanceBetweenBeds: { type: Number, default: 0 },
      },
      doors: {
        mainDoorWidth: { type: Number, default: 0 },
        mainDoorHeight: { type: Number, default: 0 },
        bathroomDoorWidth: { type: Number, default: 0 },
        bathroomDoorHeight: { type: Number, default: 0 },
        distanceFromDoorToBed: { type: Number, default: 0 },
        distanceFromDoorToWindow: { type: Number, default: 0 },
      },
      bathroom: {
        bathroomLength: { type: Number, default: 0 },
        bathroomWidth: { type: Number, default: 0 },
        showerLength: { type: Number, default: 0 },
        showerWidth: { type: Number, default: 0 },
        showerHeight: { type: Number, default: 0 },
        distanceShowerToToilet: { type: Number, default: 0 },
        toiletHeight: { type: Number, default: 0 },
        distanceToiletToWallLeft: { type: Number, default: 0 },
        distanceToiletToWallFront: { type: Number, default: 0 },
        sinkHeight: { type: Number, default: 0 },
        sinkWidth: { type: Number, default: 0 },
        counterLength: { type: Number, default: 0 },
      },
      windows: {
        windowHeight: { type: Number, default: 0 },
        windowWidth: { type: Number, default: 0 },
        distanceFromFloorToWindowSill: { type: Number, default: 0 },
        distanceBedToWindow: { type: Number, default: 0 },
      },
      furniture: {
        wardrobeWidth: { type: Number, default: 0 },
        wardrobeHeight: { type: Number, default: 0 },
        wardrobeDepth: { type: Number, default: 0 },
        distanceWardrobeToBed: { type: Number, default: 0 },
        distanceWardrobeToDoor: { type: Number, default: 0 },
        deskHeight: { type: Number, default: 0 },
        deskWidth: { type: Number, default: 0 },
        deskDepth: { type: Number, default: 0 },
        distanceDeskToBed: { type: Number, default: 0 },
        chairHeight: { type: Number, default: 0 },
        chairWidth: { type: Number, default: 0 },
        tvScreenSize: { type: Number, default: 0 },
        tvHeightFromFloor: { type: Number, default: 0 },
        distanceTvToBed: { type: Number, default: 0 },
        sofaLength: { type: Number, default: 0 },
        sofaDistanceFromBed: { type: Number, default: 0 },
        sofaDistanceFromWall: { type: Number, default: 0 },
      },
      storage: {
        luggageRackWidth: { type: Number, default: 0 },
        luggageRackHeight: { type: Number, default: 0 },
        distanceRackToBed: { type: Number, default: 0 },
        distanceRackToDoor: { type: Number, default: 0 },
      },
      lighting: {
        ceilingLightHeight: { type: Number, default: 0 },
        bedsideLampHeight: { type: Number, default: 0 },
        readingLightDistanceFromBed: { type: Number, default: 0 },
        switchHeightFromFloor: { type: Number, default: 0 },
      },
      acVentilation: {
        acHeightFromFloor: { type: Number, default: 0 },
        acDistanceFromBed: { type: Number, default: 0 },
        fanHeight: { type: Number, default: 0 },
        ventPositionHeight: { type: Number, default: 0 },
      },
      safety: {
        distanceSmokeDetectorToBed: { type: Number, default: 0 },
        distanceACToWall: { type: Number, default: 0 },
        distanceFireExitFromRoom: { type: Number, default: 0 },
        distanceRoomToElevator: { type: Number, default: 0 },
      },
      outlets: {
        distanceOutletFromBed: { type: Number, default: 0 },
        outletHeightFromFloor: { type: Number, default: 0 },
        distanceOutletFromDesk: { type: Number, default: 0 },
        wifiRouterDistanceFromDoor: { type: Number, default: 0 },
      },
      accessibility: {
        wheelchairTurningRadius: { type: Number, default: 0 },
        distanceToAccessibleBathroom: { type: Number, default: 0 },
        accessibleDoorWidth: { type: Number, default: 0 },
        accessiblePathWidth: { type: Number, default: 0 },
      },
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
    // availability: [
    //   {
    //     startDate: { type: Date, required: true },
    //     endDate: { type: Date, required: true },
    //   },
    // ],

    // // Optional: blocked dates (maintenance, holidays)
    // blockedDates: [
    //   {
    //     startDate: Date,
    //     endDate: Date,
    //     reason: String,
    //   },
    // ],
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

