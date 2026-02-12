import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IMedicine {
  medicineName: string;
  quantity: number;
  price?: number;
}

export interface IOrder extends Document {
  patientId: Types.ObjectId;
  medicines: IMedicine[];
  status: 'pending' | 'accepted' | 'delivered';
  acceptedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
    },
    medicines: [
      {
        medicineName: {
          type: String,
          required: [true, 'Medicine name is required'],
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
        price: {
          type: Number,
          default: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'delivered'],
      default: 'pending',
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
