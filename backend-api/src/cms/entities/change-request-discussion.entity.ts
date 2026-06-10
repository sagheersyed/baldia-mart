import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ChangeRequest } from './change-request.entity';
import { User } from '../../users/user.entity';

/**
 * Discussion thread entry — allows admins and merchants to negotiate
 * on change requests (e.g., "Please provide a higher-resolution image").
 */
@Entity('change_request_discussions')
export class ChangeRequestDiscussion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'change_request_id' })
  changeRequestId: string;

  @ManyToOne(() => ChangeRequest, cr => cr.discussions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'change_request_id' })
  changeRequest: ChangeRequest;

  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
