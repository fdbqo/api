import mongoose from "mongoose"

const ForecastDataSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastFetched: {
    type: Date,
    default: Date.now,
  },
})

const SurfSpotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    region: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
      default: "Intermediate",
    },
    waveType: {
      type: String,
      enum: ["Beach break", "Reef break", "Point break", "River mouth"],
      default: "Beach break",
    },
    swellDirection: {
      type: String,
      default: "",
    },
    windDirection: {
      type: String,
      default: "",
    },
    tide: {
      type: String,
      enum: ["Low", "Mid", "High", "All"],
      default: "All",
    },
    crowdFactor: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    season: {
      type: [String],
      default: [],
    },
    location: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    forecast: {
      type: ForecastDataSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.SurfSpot || mongoose.model("SurfSpot", SurfSpotSchema)

