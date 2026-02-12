import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IPrescription extends Document {
  patientId: Types.ObjectId;
  imageUrl: string;
  notes?: string;
  status: 'pending' | 'processed';
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Prescription image URL is required'],
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const Prescription: Model<IPrescription> =
  mongoose.models.Prescription || mongoose.model<IPrescription>('Prescription', PrescriptionSchema);

export default Prescription;
