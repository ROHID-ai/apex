from app.database import db
from datetime import datetime

class Attendance(db.Model):
    __tablename__ = 'attendance'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    check_in_time = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='Present')

    def __repr__(self):
        return f'<Attendance {self.id} for User {self.user_id}>'
