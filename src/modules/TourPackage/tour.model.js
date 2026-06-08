import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    secure_url: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const BatchSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  pricePerPerson: { type: Number, required: true },
  totalSeats: { type: Number, default: 12 },
  occupiedSeats: { type: Number, default: 0 },
});

const ItinerarySchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true },
  title: { type: String, required: true }, 
  dayImages: [ImageSchema],
  descriptionPoints: [{ type: String }] 
});


const TripSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g. "Experience Darjeeling & Sikkim"
  slug: { type: String, required: true, unique: true },
  
  gallery: {
  type: [ImageSchema],
  validate: {
    validator: function (v) {
      return v.length <= 12;
    },
    message: "Gallery cannot have more than 12 images.",
  },
},

  summary: {
    pickup: { type: String, default: "" },
    dropoff: { type: String, default: "" },
    duration: { type: String, default: "" } // e.g. "6N/7D"
  },

  aboutTrip: { type: String }, 

  highlights: [{
    text: { type: String }
  }],

  itinerary: [ItinerarySchema],

  inclusions: [{
    text: { type: String }
  }],
  exclusions: [{
    text: { type: String }
  }],

  thingsToCarry: [{
    category: { type: String }, 
    items: [{ type: String }]    
  }],

  generalPolicy: {
    title : { type: String },
    points: [{ type: String }]
  },
  cancellationPolicy: [
    {type: String}
  ],

  faqs: [{
    question: { type: String },
    answer: { type: String }
  }],

  batches: [BatchSchema]

}, { 
  timestamps: true,
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

BatchSchema.virtual('seatsLeft').get(function() {
  return this.totalSeats - this.occupiedSeats;
});

const Trip = mongoose.model('Trip', TripSchema);

export default Trip;